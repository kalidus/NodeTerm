/**
 * sslCertAnalyzer - Diagnostico de confianza y enriquecimiento de certificados TLS
 */

const net = require('net');
const { X509Certificate } = require('crypto');

const STATUS_LABELS = {
  trusted: 'Valido',
  self_signed: 'Autofirmado',
  untrusted_ca: 'CA no confiable',
  incomplete_chain: 'Cadena incompleta',
  hostname_mismatch: 'Hostname no coincide',
  expired: 'Expirado',
  not_yet_valid: 'Aun no vigente',
  unknown: 'No confiable'
};

const STATUS_PRIORITY = [
  'expired',
  'not_yet_valid',
  'hostname_mismatch',
  'self_signed',
  'incomplete_chain',
  'untrusted_ca',
  'unknown'
];

const WEAK_SIG_RE = /sha1|md5|md2/i;

function parseSslTarget(host, port = 443) {
  let raw = String(host || '').trim();
  if (!raw) {
    return { host: '', port: Number(port) || 443 };
  }

  raw = raw.replace(/^https?:\/\//i, '');
  const slash = raw.indexOf('/');
  if (slash !== -1) raw = raw.slice(0, slash);

  let hostname = raw;
  let parsedPort = Number(port) || 443;

  if (raw.startsWith('[')) {
    const m = raw.match(/^\[([^\]]+)\](?::(\d{1,5}))?$/);
    if (m) {
      hostname = m[1];
      if (m[2]) parsedPort = Number(m[2]);
    }
  } else if (net.isIP(raw) === 0) {
    const lastColon = raw.lastIndexOf(':');
    if (lastColon > 0) {
      const maybePort = raw.slice(lastColon + 1);
      if (/^\d{1,5}$/.test(maybePort)) {
        const n = Number(maybePort);
        if (n >= 1 && n <= 65535) {
          hostname = raw.slice(0, lastColon);
          parsedPort = n;
        }
      }
    }
  }

  return { host: hostname, port: parsedPort };
}

function dnKey(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj.trim().toLowerCase();
  const keys = ['CN', 'O', 'OU', 'C', 'ST', 'L', 'emailAddress'];
  return keys.map((k) => String(obj[k] || '').trim().toLowerCase()).join('|');
}

function formatDn(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  const order = ['CN', 'O', 'OU', 'L', 'ST', 'C', 'emailAddress'];
  const seen = new Set();
  const parts = [];
  for (const k of order) {
    if (obj[k]) {
      parts.push(`${k}=${obj[k]}`);
      seen.add(k);
    }
  }
  for (const k of Object.keys(obj)) {
    if (!seen.has(k) && obj[k]) parts.push(`${k}=${obj[k]}`);
  }
  return parts.join(', ');
}

function isSelfSignedCert(cert) {
  if (!cert) return false;
  const subj = dnKey(cert.subject);
  const iss = dnKey(cert.issuer);
  if (subj && iss && subj === iss) return true;
  if (cert.issuerCertificate && cert.issuerCertificate === cert) return true;
  if (
    cert.issuerCertificate &&
    cert.fingerprint256 &&
    cert.issuerCertificate.fingerprint256 &&
    cert.fingerprint256 === cert.issuerCertificate.fingerprint256
  ) {
    return true;
  }
  return false;
}

function getAuthError(socket) {
  const err = socket && socket.authorizationError;
  if (!err) return { code: null, message: null };
  if (typeof err === 'string') {
    return { code: err, message: err };
  }
  const code = err.code || err.reason || null;
  const message = err.message || String(err);
  return { code: code || message, message };
}

function parseSans(subjectaltname) {
  if (!subjectaltname) return [];
  return String(subjectaltname)
    .split(/,\s*/)
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf(':');
      if (idx === -1) return { type: 'other', value: entry, raw: entry };
      return {
        type: entry.slice(0, idx).trim(),
        value: entry.slice(idx + 1).trim(),
        raw: entry
      };
    });
}

function derToPem(raw) {
  if (!raw) return null;
  const b64 = Buffer.from(raw).toString('base64');
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}

function loadX509(cert, socket) {
  try {
    if (socket && typeof socket.getPeerX509Certificate === 'function') {
      const fromSocket = socket.getPeerX509Certificate();
      if (fromSocket) return fromSocket;
    }
  } catch (_) {
    /* fallback below */
  }
  try {
    if (cert && cert.raw) return new X509Certificate(cert.raw);
  } catch (_) {
    return null;
  }
  return null;
}

function friendlySigName(name, oid) {
  if (!name && !oid) return null;
  const raw = String(name || oid);
  const map = {
    sha256WithRSAEncryption: 'SHA-256 with RSA',
    sha384WithRSAEncryption: 'SHA-384 with RSA',
    sha512WithRSAEncryption: 'SHA-512 with RSA',
    sha1WithRSAEncryption: 'SHA-1 with RSA',
    md5WithRSAEncryption: 'MD5 with RSA',
    ecdsaWithSHA256: 'ECDSA with SHA-256',
    ecdsaWithSHA384: 'ECDSA with SHA-384',
    ecdsaWithSHA512: 'ECDSA with SHA-512',
    ecdsaWithSHA1: 'ECDSA with SHA-1',
    rsassaPss: 'RSASSA-PSS',
    ed25519: 'Ed25519'
  };
  return map[raw] || raw;
}

function parseWithForge(raw) {
  if (!raw) return null;
  try {
    const forge = require('node-forge');
    const asn1 = forge.asn1.fromDer(raw.toString('binary'));
    const parsed = forge.pki.certificateFromAsn1(asn1);
    const oid = (parsed.siginfo && parsed.siginfo.algorithmOid) || parsed.signatureOid;
    const algName = (oid && forge.pki.oids[oid]) || oid || null;

    let keyType = null;
    let bits = null;
    if (parsed.publicKey) {
      if (parsed.publicKey.n && typeof parsed.publicKey.n.bitLength === 'function') {
        keyType = 'RSA';
        bits = parsed.publicKey.n.bitLength();
      } else if (parsed.publicKey.curveName || parsed.publicKey.curve) {
        keyType = 'EC';
      }
    }

    const ku = parsed.getExtension('keyUsage');
    const eku = parsed.getExtension('extKeyUsage');
    const bc = parsed.getExtension('basicConstraints');

    const keyUsage = [];
    if (ku) {
      const flags = [
        'digitalSignature',
        'nonRepudiation',
        'keyEncipherment',
        'dataEncipherment',
        'keyAgreement',
        'keyCertSign',
        'cRLSign'
      ];
      for (const flag of flags) {
        if (ku[flag]) keyUsage.push(flag);
      }
    }

    const extKeyUsage = [];
    if (eku) {
      const ekuFlags = ['serverAuth', 'clientAuth', 'codeSigning', 'emailProtection', 'timeStamping', 'ocspSigning'];
      for (const flag of ekuFlags) {
        if (eku[flag]) extKeyUsage.push(flag);
      }
    }

    return {
      signatureAlgorithm: friendlySigName(algName, oid),
      publicKey: keyType ? { type: keyType, bits } : null,
      keyUsage: keyUsage.length ? keyUsage : null,
      extKeyUsage: extKeyUsage.length ? extKeyUsage : null,
      isCA: bc ? Boolean(bc.cA) : null
    };
  } catch (_) {
    return null;
  }
}

function checkNameMatch(x509, host, sans, commonName) {
  const ipVersion = net.isIP(host);
  const type = ipVersion ? 'ip' : 'dns';
  let matched = null;

  if (x509) {
    try {
      if (ipVersion) matched = x509.checkIP(host) || null;
      else matched = x509.checkHost(host, { wildcards: true, partialWildcards: true }) || null;
    } catch (_) {
      matched = null;
    }
  }

  const hostLower = String(host).toLowerCase();
  if (!matched && sans && sans.length) {
    const found = sans.find((san) => {
      const value = String(san.value || '').toLowerCase();
      if (type === 'ip') {
        return (san.type === 'IP Address' || san.type === 'IP') && value === hostLower;
      }
      if (san.type === 'DNS') {
        if (value === hostLower) return true;
        if (value.startsWith('*.')) {
          const rest = value.slice(2);
          const idx = hostLower.indexOf('.');
          return idx !== -1 && hostLower.slice(idx + 1) === rest;
        }
      }
      return false;
    });
    if (found) matched = found.value;
  }

  if (!matched && commonName && String(commonName).toLowerCase() === hostLower) {
    matched = commonName;
  }

  return {
    matches: Boolean(matched),
    checkedName: host,
    type,
    matchedSan: matched,
    sans: sans || []
  };
}

function pickPrimaryStatus(issueCodes, authorized) {
  if (authorized) return 'trusted';
  for (const status of STATUS_PRIORITY) {
    if (issueCodes.has(status)) return status;
  }
  return 'unknown';
}

function analyzeCertificate(socket, cert, host) {
  const sans = parseSans(cert && cert.subjectaltname);
  const x509 = loadX509(cert, socket);
  const forgeInfo = cert && cert.raw ? parseWithForge(cert.raw) : null;
  const auth = getAuthError(socket);
  const authCode = String(auth.code || '').toUpperCase();
  const authMsg = String(auth.message || '').toUpperCase();
  const authorized = Boolean(socket && socket.authorized);

  const validFrom = cert ? new Date(cert.valid_from) : null;
  const validTo = cert ? new Date(cert.valid_to) : null;
  const now = Date.now();
  const expired = Boolean(validTo && !Number.isNaN(validTo.getTime()) && validTo.getTime() < now);
  const notYetValid = Boolean(validFrom && !Number.isNaN(validFrom.getTime()) && validFrom.getTime() > now);
  const daysUntilExpiry = validTo && !Number.isNaN(validTo.getTime())
    ? Math.floor((validTo.getTime() - now) / (1000 * 60 * 60 * 24))
    : null;

  const selfSigned = isSelfSignedCert(cert)
    || authCode.includes('DEPTH_ZERO_SELF_SIGNED_CERT')
    || authCode.includes('SELF_SIGNED_CERT_IN_CHAIN')
    || authMsg.includes('DEPTH_ZERO_SELF_SIGNED_CERT')
    || authMsg.includes('SELF_SIGNED_CERT_IN_CHAIN');

  const hostnameMatch = checkNameMatch(x509, host, sans, cert && cert.subject ? cert.subject.CN : null);

  const issuerMissing = authCode.includes('UNABLE_TO_GET_ISSUER_CERT')
    || authMsg.includes('UNABLE_TO_GET_ISSUER_CERT');
  const leafUnverifiable = authCode.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')
    || authMsg.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
  const incompleteChain = !selfSigned && (issuerMissing || leafUnverifiable);

  const issues = [];
  const issueCodes = new Set();

  if (expired || authCode.includes('CERT_HAS_EXPIRED') || authMsg.includes('CERT_HAS_EXPIRED')) {
    issues.push({
      code: 'EXPIRED',
      severity: 'critical',
      title: 'Certificado expirado',
      detail: daysUntilExpiry !== null
        ? `El certificado expiro hace ${Math.abs(daysUntilExpiry)} dia(s) (hasta ${cert.valid_to}).`
        : `El certificado ha expirado (${cert.valid_to}).`
    });
    issueCodes.add('expired');
  }

  if (notYetValid || authCode.includes('CERT_NOT_YET_VALID') || authMsg.includes('CERT_NOT_YET_VALID')) {
    issues.push({
      code: 'NOT_YET_VALID',
      severity: 'critical',
      title: 'Certificado aun no vigente',
      detail: `El certificado no es valido hasta ${cert.valid_from}.`
    });
    issueCodes.add('not_yet_valid');
  }

  if (!hostnameMatch.matches && !authorized) {
    const sanList = sans.length
      ? sans.map((s) => s.raw).join(', ')
      : 'sin SAN declarado';
    issues.push({
      code: 'HOSTNAME_MISMATCH',
      severity: 'critical',
      title: hostnameMatch.type === 'ip' ? 'IP no coincide con el certificado' : 'Hostname no coincide con el certificado',
      detail: `El valor comprobado (${host}) no aparece en CN/SAN. Nombres del certificado: ${sanList}.`
    });
    issueCodes.add('hostname_mismatch');
  }

  if (selfSigned) {
    issues.push({
      code: 'SELF_SIGNED',
      severity: 'high',
      title: 'Certificado autofirmado',
      detail: 'El emisor coincide con el sujeto. No hay una CA publica que avale este certificado; es habitual en equipos internos, pero los clientes no lo consideraran de confianza.'
    });
    issueCodes.add('self_signed');
  } else if (incompleteChain) {
    issues.push({
      code: 'INCOMPLETE_CHAIN',
      severity: 'high',
      title: 'Cadena de certificados incompleta',
      detail: 'El servidor no envia (o no se puede verificar) el certificado intermedio. Los clientes no podran construir la cadena hasta una CA raiz de confianza.'
    });
    issueCodes.add('incomplete_chain');
  } else if (!authorized && issueCodes.size === 0) {
    issues.push({
      code: 'UNTRUSTED_CA',
      severity: 'high',
      title: 'CA no confiable',
      detail: auth.message
        ? `El almacén de confianza del sistema no avala este certificado (${auth.code || auth.message}).`
        : 'El almacén de confianza del sistema no avala el emisor de este certificado.'
    });
    issueCodes.add('untrusted_ca');
  }

  const signatureAlgorithm = (cert && cert.signatureAlgorithm)
    || (forgeInfo && forgeInfo.signatureAlgorithm)
    || null;
  if (signatureAlgorithm && WEAK_SIG_RE.test(signatureAlgorithm)) {
    issues.push({
      code: 'WEAK_SIGNATURE',
      severity: 'high',
      title: 'Algoritmo de firma debil',
      detail: `El certificado usa ${signatureAlgorithm}. SHA-1 y MD5 no se consideran seguros.`
    });
  }

  const pem = x509 && typeof x509.toString === 'function'
    ? x509.toString()
    : derToPem(cert && cert.raw);

  let publicKey = null;
  if (forgeInfo && forgeInfo.publicKey) {
    publicKey = forgeInfo.publicKey;
  } else if (cert && cert.pubkey) {
    publicKey = {
      type: cert.pubkey.type || null,
      bits: cert.bits || cert.pubkey.bits || null
    };
  } else if (x509 && x509.publicKey) {
    publicKey = {
      type: x509.publicKey.asymmetricKeyType || null,
      bits: x509.publicKey.asymmetricKeySize || cert.bits || null
    };
  } else if (cert && cert.bits) {
    publicKey = { type: null, bits: cert.bits };
  }

  const keyUsage = (x509 && x509.keyUsage) || (forgeInfo && forgeInfo.keyUsage) || null;
  const extKeyUsage = forgeInfo && forgeInfo.extKeyUsage ? forgeInfo.extKeyUsage : null;
  const isCA = (x509 && typeof x509.ca === 'boolean')
    ? x509.ca
    : (forgeInfo ? forgeInfo.isCA : null);

  const status = pickPrimaryStatus(issueCodes, authorized);
  const statusLabel = STATUS_LABELS[status] || STATUS_LABELS.unknown;
  const primaryIssue = issues[0] || null;

  const certificate = {
    subject: cert.subject,
    issuer: cert.issuer,
    subjectDn: formatDn(cert.subject),
    issuerDn: formatDn(cert.issuer),
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    serialNumber: cert.serialNumber,
    fingerprint: cert.fingerprint,
    fingerprint256: cert.fingerprint256,
    subjectAltNames: sans.map((s) => s.raw),
    sans,
    isValid: authorized,
    daysUntilExpiry,
    expired,
    notYetValid,
    signatureAlgorithm,
    publicKey,
    keyUsage,
    extKeyUsage,
    isCA,
    selfSigned,
    pem,
    modulus: cert.modulus || null,
    exponent: cert.exponent || null
  };

  const trust = {
    authorized,
    status,
    statusLabel,
    summary: primaryIssue ? primaryIssue.detail : 'El certificado es de confianza para este host.',
    authorizationError: auth.code || auth.message,
    issues,
    hostnameMatch,
    selfSigned,
    chainComplete: authorized || (!incompleteChain && !selfSigned)
  };

  return { certificate, trust, pem };
}

function buildChain(leafCert) {
  const chain = [];
  let current = leafCert;
  const seen = new Set();
  let depth = 0;

  while (current && current.subject && depth < 12) {
    const fp = current.fingerprint256 || current.fingerprint || `idx-${depth}`;
    if (seen.has(fp)) break;
    seen.add(fp);

    const selfSigned = isSelfSignedCert(current);
    chain.push({
      subject: current.subject,
      issuer: current.issuer,
      subjectDn: formatDn(current.subject),
      issuerDn: formatDn(current.issuer),
      validFrom: current.valid_from,
      validTo: current.valid_to,
      serialNumber: current.serialNumber || null,
      fingerprint: current.fingerprint || null,
      fingerprint256: current.fingerprint256 || null,
      selfSigned,
      pem: derToPem(current.raw)
    });

    const next = current.issuerCertificate;
    if (!next || next === current) break;
    current = next;
    depth += 1;
  }

  return chain.map((item, idx) => {
    let role = 'Intermedio';
    if (chain.length === 1) {
      role = item.selfSigned ? 'Servidor (autofirmado)' : 'Servidor';
    } else if (idx === 0) {
      role = 'Servidor';
    } else if (idx === chain.length - 1) {
      role = item.selfSigned ? 'Root CA' : 'Emisor';
    }
    return { ...item, role, index: idx };
  });
}

function computeSecurityAssessment({ trust, daysUntilExpiry, supportedProtocols }) {
  const protocols = Array.isArray(supportedProtocols) ? supportedProtocols : [];
  const deprecatedCount = protocols.filter((p) => p.deprecated).length;
  const secureCount = protocols.filter((p) => !p.deprecated).length;
  const expiry = typeof daysUntilExpiry === 'number' ? daysUntilExpiry : 0;

  let score = 0;
  if (trust && trust.authorized) score += 40;
  if (expiry > 90) score += 20;
  else if (expiry > 30) score += 10;
  if (secureCount > 0) score += 20;
  if (deprecatedCount === 0 && protocols.length > 0) score += 20;

  const status = (trust && trust.status) || 'unknown';
  let riskLevel = 'BAJO';
  if (status === 'expired' || status === 'not_yet_valid' || status === 'hostname_mismatch' || expiry < 0) {
    riskLevel = 'CRITICO';
  } else if (status === 'self_signed' || status === 'untrusted_ca' || status === 'incomplete_chain') {
    riskLevel = 'ALTO';
  } else if (deprecatedCount > 2 || (expiry >= 0 && expiry < 30)) {
    riskLevel = 'ALTO';
  } else if (deprecatedCount > 0 || (expiry >= 0 && expiry < 90)) {
    riskLevel = 'MEDIO';
  }

  return { score, riskLevel };
}

function buildRecommendations({ trust, certificate, hasWeakProtocols, supportedProtocols }) {
  const recs = [];

  if (trust && trust.status === 'self_signed') {
    recs.push('Sustituye el certificado autofirmado por uno emitido por una CA interna o publica si los clientes deben confiar en el servicio.');
  } else if (trust && trust.status === 'incomplete_chain') {
    recs.push('Configura el servidor para enviar el certificado intermedio completo (full chain).');
  } else if (trust && trust.status === 'untrusted_ca') {
    recs.push('Usa un certificado emitido por una CA presente en el almacen de confianza de los clientes.');
  } else if (trust && trust.status === 'hostname_mismatch') {
    recs.push('Emite un certificado cuyo CN/SAN coincida con el hostname o la IP de conexion.');
  } else if (trust && trust.status === 'expired') {
    recs.push('Renueva el certificado y vuelve a desplegarlo en el servidor.');
  } else if (trust && trust.status === 'not_yet_valid') {
    recs.push('Espera a la fecha de inicio de vigencia o corrige el reloj del sistema/servidor.');
  }

  if (hasWeakProtocols) {
    recs.push('Se detectaron protocolos obsoletos (TLSv1.0 / TLSv1.1). Se recomienda deshabilitarlos y dejar solo TLSv1.2 o TLSv1.3.');
  }

  const protocols = Array.isArray(supportedProtocols) ? supportedProtocols : [];
  if (protocols.length === 0) {
    recs.push('No se pudo establecer conexion con ningun protocolo SSL/TLS.');
  } else if (!protocols.some((p) => !p.deprecated)) {
    recs.push('Solo se soportan protocolos obsoletos. Se recomienda habilitar TLSv1.2 o superior.');
  }

  if (certificate && typeof certificate.daysUntilExpiry === 'number') {
    if (certificate.daysUntilExpiry >= 0 && certificate.daysUntilExpiry < 30) {
      recs.push(`El certificado expira en ${certificate.daysUntilExpiry} dias. Renuevalo antes de que caduque.`);
    }
  }

  if (certificate && certificate.publicKey && certificate.publicKey.type === 'RSA' && certificate.publicKey.bits && certificate.publicKey.bits < 2048) {
    recs.push(`La clave RSA tiene ${certificate.publicKey.bits} bits. Se recomienda un minimo de 2048 bits.`);
  }

  const unique = [];
  for (const rec of recs) {
    if (!unique.includes(rec)) unique.push(rec);
  }
  return unique;
}

module.exports = {
  STATUS_LABELS,
  parseSslTarget,
  analyzeCertificate,
  buildChain,
  computeSecurityAssessment,
  buildRecommendations,
  formatDn
};
