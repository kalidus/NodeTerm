//! Puente RDPEUDP2 + TLS + RDPEMT para NodeTerm.
//!
//! El primer frame de stdin es JSON (host, puerto, requestId, cookie).
//! La respuesta es un frame JSON. Después, cada frame es un PDU DRDYNVC
//! sin encapsular: stdout trae lo que llega del servidor y stdin lo que
//! hay que enviarle. Un frame de longitud 0 cierra el proceso.

use std::io::{self, Read, Write};
use std::net::{IpAddr, SocketAddr};

use base64::Engine as _;
use ironrdp_rdpemt::TunnelConfig;
use ironrdp_rdpeudp_tokio::transport::{UdpTlsConfig, UdpTransportConfig, connect_udp};
use serde::Deserialize;
use tokio::sync::mpsc;

#[derive(Deserialize)]
struct OpenRequest {
    host: String,
    port: u16,
    #[serde(rename = "serverName")]
    server_name: String,
    #[serde(rename = "requestId")]
    request_id: u32,
    cookie: String,
}

fn read_frame(input: &mut impl Read) -> io::Result<Vec<u8>> {
    let mut len_buf = [0u8; 4];
    input.read_exact(&mut len_buf)?;
    let len = u32::from_le_bytes(len_buf) as usize;
    if len > 8 * 1024 * 1024 {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "frame demasiado grande"));
    }
    let mut buf = vec![0u8; len];
    if len > 0 {
        input.read_exact(&mut buf)?;
    }
    Ok(buf)
}

fn write_frame(output: &mut impl Write, bytes: &[u8]) -> io::Result<()> {
    let len = u32::try_from(bytes.len()).map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "frame demasiado grande"))?;
    output.write_all(&len.to_le_bytes())?;
    output.write_all(bytes)?;
    output.flush()
}

fn fail(message: &str) -> ! {
    let body = serde_json::json!({ "ok": false, "error": message }).to_string();
    let mut stdout = io::stdout().lock();
    let _ = write_frame(&mut stdout, body.as_bytes());
    std::process::exit(1);
}

#[tokio::main]
async fn main() {
    let _ = tokio_rustls::rustls::crypto::ring::default_provider().install_default();

    let mut stdin = io::stdin().lock();
    let open = match read_frame(&mut stdin) {
        Ok(bytes) => bytes,
        Err(error) => fail(&format!("no llego la peticion: {error}")),
    };
    drop(stdin);

    let request: OpenRequest = match serde_json::from_slice(&open) {
        Ok(request) => request,
        Err(error) => fail(&format!("peticion invalida: {error}")),
    };
    let cookie = match base64::engine::general_purpose::STANDARD.decode(request.cookie.trim()) {
        Ok(cookie) if cookie.len() == 16 => cookie,
        _ => fail("la cookie de seguridad tiene que ser 16 bytes"),
    };
    let mut security_cookie = [0u8; 16];
    security_cookie.copy_from_slice(&cookie);

    let server_addr = match resolve_addr(&request.host, request.port).await {
        Ok(addr) => addr,
        Err(error) => fail(&error),
    };
    let server_name = if request.server_name.is_empty() {
        request.host.clone()
    } else {
        request.server_name.clone()
    };

    let tunnel = TunnelConfig {
        request_id: request.request_id,
        security_cookie,
    };
    let mut config = UdpTransportConfig::new(server_addr, server_name.clone(), tunnel);
    config.tls = UdpTlsConfig::new(server_name);

    let mut transport = match connect_udp(config).await {
        Ok(transport) => transport,
        Err(error) => fail(&format!("UDP no se establecio: {error}")),
    };

    {
        let body = serde_json::json!({ "ok": true }).to_string();
        let mut stdout = io::stdout().lock();
        if write_frame(&mut stdout, body.as_bytes()).is_err() {
            std::process::exit(1);
        }
    }

    let sender = transport.sender();
    let (inbound_tx, mut inbound_rx) = mpsc::unbounded_channel::<Vec<u8>>();
    std::thread::spawn(move || {
        let stdin = io::stdin();
        let mut stdin = stdin.lock();
        loop {
            match read_frame(&mut stdin) {
                Ok(frame) if frame.is_empty() => break,
                Ok(frame) => {
                    if inbound_tx.send(frame).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    loop {
        tokio::select! {
            incoming = transport.recv() => {
                let Some(payload) = incoming else { break };
                let mut stdout = io::stdout().lock();
                if write_frame(&mut stdout, &payload).is_err() {
                    break;
                }
            }
            outgoing = inbound_rx.recv() => {
                let Some(payload) = outgoing else { break };
                if let Err(error) = sender.send(payload).await {
                    eprintln!("nodeterm-rdpeudp: envio fallido: {error}");
                    break;
                }
            }
        }
    }
}

async fn resolve_addr(host: &str, port: u16) -> Result<SocketAddr, String> {
    if let Ok(ip) = host.parse::<IpAddr>() {
        return Ok(SocketAddr::new(ip, port));
    }
    let mut found = tokio::net::lookup_host((host, port))
        .await
        .map_err(|error| format!("no se resolvio {host}: {error}"))?;
    found.next().ok_or_else(|| format!("no se resolvio {host}"))
}
