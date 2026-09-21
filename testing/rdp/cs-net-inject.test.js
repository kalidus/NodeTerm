const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const {
  injectClientNetworkChannels,
  findClientNetworkChannels,
  prepareMcsConnectInitial,
  CS_NET
} = require('../../src/main/services/rdp-mcs-helpers');

const CHANNEL_OPTION_INITIALIZED = 0x80000000;

function buildCsNet(channels) {
  const buf = Buffer.alloc(8 + channels.length * 12);
  buf.writeUInt16LE(CS_NET, 0);
  buf.writeUInt16LE(buf.length, 2);
  buf.writeUInt32LE(channels.length, 4);
  channels.forEach(([name, options], i) => {
    const off = 8 + i * 12;
    buf.write(name, off, 'ascii');
    buf.writeUInt32LE(options >>> 0, off + 8);
  });
  return buf;
}

function buildCsCore() {
  const buf = Buffer.alloc(216);
  buf.writeUInt16LE(0xc001, 0);
  buf.writeUInt16LE(buf.length, 2);
  buf.writeUInt32LE(0x00080004, 4); // version RDP tipica
  buf.writeUInt16LE(1920, 8);
  buf.writeUInt16LE(1080, 10);
  buf.writeUInt32LE(2600, 20);      // clientBuild
  buf.writeUInt32LE(0x409, 16);     // keyboardLayout
  buf.writeUInt32LE(0x00000001, 212);
  return buf;
}

// MCS Connect Initial completo: TPKT + X224 + BER Connect-Initial + OCTET STRING userData +
// GCC ConferenceCreateRequest (con el OID y la clave H.221 "Duca") + bloques TS_UD_CS_*
function buildMcsConnectInitial(channels, { wideDuca = true, includeCore = true } = {}) {
  const userDataBlocks = includeCore
    ? Buffer.concat([buildCsCore(), buildCsNet(channels)])
    : buildCsNet(channels);

  const ducaLen = wideDuca
    ? Buffer.from([0x80 | ((userDataBlocks.length >> 8) & 0x3f), userDataBlocks.length & 0xff])
    : Buffer.from([userDataBlocks.length]);

  const gcc = Buffer.concat([
    Buffer.from([0x00, 0x05, 0x00, 0x14, 0x7c, 0x00, 0x01]),
    Buffer.from([0x81, 0x00]),             // connectPDU length (la corrige el parche de Wallix)
    Buffer.from([0x00, 0x08, 0x00, 0x10, 0x00, 0x01, 0xc0, 0x00]),
    Buffer.from('Duca', 'ascii'),
    ducaLen,
    userDataBlocks
  ]);

  const berPrefix = Buffer.concat([
    Buffer.from([0x04, 0x01, 0x01]),       // callingDomainSelector
    Buffer.from([0x04, 0x01, 0x01]),       // calledDomainSelector
    Buffer.from([0x01, 0x01, 0xff]),       // upwardFlag
    Buffer.alloc(0x1b, 0x30),              // target/min/max DomainParameters (relleno)
    Buffer.from([0x04, 0x82, (gcc.length >> 8) & 0xff, gcc.length & 0xff])
  ]);

  const ciContent = Buffer.concat([berPrefix, gcc]);
  const ci = Buffer.concat([
    Buffer.from([0x7f, 0x65, 0x82, (ciContent.length >> 8) & 0xff, ciContent.length & 0xff]),
    ciContent
  ]);

  const total = 4 + 3 + ci.length;
  return Buffer.concat([
    Buffer.from([0x03, 0x00, (total >> 8) & 0xff, total & 0xff]),
    Buffer.from([0x02, 0xf0, 0x80]),
    ci
  ]);
}

// Revalida el anidamiento completo de longitudes: si alguna no cuadra, Wallix cierra con ERR_GCC
function assertLengthsCoherent(buf) {
  assert.equal(buf.readUInt16BE(2), buf.length, 'longitud TPKT');

  assert.equal(buf[7], 0x7f);
  assert.equal(buf[8], 0x65);
  assert.equal(buf[9], 0x82, 'ancho BER de Connect-Initial preservado');
  assert.equal(12 + buf.readUInt16BE(10), buf.length, 'longitud Connect-Initial');

  const oidAt = buf.indexOf(Buffer.from([0x00, 0x14, 0x7c, 0x00, 0x01]));
  assert.ok(oidAt > 0, 'OID de GCC presente');
  const udTag = oidAt - 6;
  assert.equal(buf[udTag], 0x04, 'tag del OCTET STRING de userData');
  assert.equal(buf[udTag + 1], 0x82);
  assert.equal(udTag + 4 + buf.readUInt16BE(udTag + 2), buf.length, 'longitud de userData');

  const duca = buf.indexOf(Buffer.from('Duca'));
  assert.ok(duca > 0, 'clave H.221 presente');
  const ducaLen = ((buf[duca + 4] & 0x3f) << 8) | buf[duca + 5];
  assert.equal(duca + 6 + ducaLen, buf.length, 'longitud de userData de Duca');

  const csNet = buf.indexOf(Buffer.from([0x03, 0xc0]), duca);
  assert.ok(csNet > 0, 'bloque CS_NET presente');
  const csNetLen = buf.readUInt16LE(csNet + 2);
  const count = buf.readUInt32LE(csNet + 4);
  assert.equal(csNetLen, 8 + count * 12, 'longitud de CS_NET coherente con channelCount');
}

describe('inyeccion de canales en TS_UD_CS_NET', () => {
  test('el frame sintetico de partida ya es coherente', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    assertLengthsCoherent(frame);
    assert.deepEqual(findClientNetworkChannels(frame), ['cliprdr']);
  });

  test('añade los canales y recalcula todas las longitudes anidadas', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, ['rdpsnd', 'rdpdr', 'drdynvc']);

    assert.equal(res.patched, true);
    assert.deepEqual(res.added, ['rdpsnd', 'rdpdr', 'drdynvc']);
    assert.equal(res.buf.length, frame.length + 36);
    assertLengthsCoherent(res.buf);
  });

  // Con la forma de array los canales van detras, asi que cliprdr sigue el primero
  test('cliprdr se mantiene en el indice 0 con la forma de array', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, ['rdpsnd', 'rdpdr', 'drdynvc']);

    assert.deepEqual(findClientNetworkChannels(res.buf), ['cliprdr', 'rdpsnd', 'rdpdr', 'drdynvc']);
  });

  // El indice es lo unico que importa: el bastion empareja su lista con la del cliente por
  // posicion, no por nombre, asi que hay que poder dejar cliprdr donde lo pone un cliente Windows.
  test('coloca canales delante y detras para fijar el indice de cliprdr', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, {
      before: ['rdpdr', 'rdpsnd'],
      after: ['drdynvc']
    });

    assert.equal(res.patched, true);
    assert.deepEqual(
      findClientNetworkChannels(res.buf),
      ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'],
      'cliprdr debe quedar en el indice 2, como en mstsc'
    );
    assertLengthsCoherent(res.buf);
  });

  test('solo delante: desplaza cliprdr sin anadir nada detras', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, { before: ['rdpdr'] });

    assert.deepEqual(findClientNetworkChannels(res.buf), ['rdpdr', 'cliprdr']);
    assertLengthsCoherent(res.buf);
  });

  test('un canal repetido entre delante y detras solo se anade una vez', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, {
      before: ['rdpdr'],
      after: ['rdpdr', 'drdynvc']
    });

    assert.deepEqual(res.added, ['rdpdr', 'drdynvc']);
    assert.deepEqual(findClientNetworkChannels(res.buf), ['rdpdr', 'cliprdr', 'drdynvc']);
    assertLengthsCoherent(res.buf);
  });

  test('los canales nuevos llevan CHANNEL_OPTION_INITIALIZED', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, ['rdpsnd']);

    const csNet = res.buf.indexOf(Buffer.from([0x03, 0xc0]), res.buf.indexOf(Buffer.from('Duca')));
    const options = res.buf.readUInt32LE(csNet + 8 + 12 + 8) >>> 0;
    assert.equal((options & CHANNEL_OPTION_INITIALIZED) >>> 0, CHANNEL_OPTION_INITIALIZED);
  });

  test('no duplica un canal ya declarado', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000], ['rdpsnd', 0xc0000000]]);
    const res = injectClientNetworkChannels(frame, ['rdpsnd', 'rdpdr']);

    assert.deepEqual(res.added, ['rdpdr']);
    assert.deepEqual(findClientNetworkChannels(res.buf), ['cliprdr', 'rdpsnd', 'rdpdr']);
  });

  test('sin canales que añadir devuelve el buffer intacto', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, ['cliprdr']);

    assert.equal(res.patched, false);
    assert.equal(res.reason, 'already-present');
    assert.equal(res.buf, frame);
  });

  test('un nombre de mas de 7 caracteres se ignora en vez de truncarse', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = injectClientNetworkChannels(frame, ['demasiadolargo']);

    assert.equal(res.patched, false);
    assert.equal(res.buf, frame);
  });

  test('aborta sin tocar el buffer si la longitud TPKT no cuadra', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    frame.writeUInt16BE(frame.length - 3, 2);
    const res = injectClientNetworkChannels(frame, ['rdpsnd']);

    assert.equal(res.patched, false);
    assert.equal(res.reason, 'tpkt-len-mismatch');
    assert.equal(res.buf, frame);
  });

  // Ensanchar el campo desplazaria todo el buffer: es preferible abortar que emitir un PDU roto
  test('aborta si la longitud de Duca no cabe en su ancho de un byte', () => {
    // 9 canales -> userData = 8 + 108 = 116, en forma corta; sumar 12 se pasaria de 0x7f
    const channels = [['cliprdr', 0xc0a00000]];
    for (let i = 0; i < 8; i++) channels.push([`ch${i}`, 0x80000000]);
    const frame = buildMcsConnectInitial(channels, { wideDuca: false, includeCore: false });

    const duca = frame.indexOf(Buffer.from('Duca'));
    assert.equal(frame[duca + 4] & 0x80, 0, 'la longitud de Duca debe venir en forma corta');

    const res = injectClientNetworkChannels(frame, ['rdpsnd']);
    assert.equal(res.patched, false);
    assert.equal(res.reason, 'duca-len-overflow');
    assert.equal(res.buf, frame);
  });

  test('no explota con entradas basura', () => {
    assert.equal(injectClientNetworkChannels(null, ['rdpsnd']).patched, false);
    assert.equal(injectClientNetworkChannels(Buffer.alloc(4), ['rdpsnd']).patched, false);
    assert.equal(injectClientNetworkChannels(buildMcsConnectInitial([['cliprdr', 0]]), []).patched, false);
  });
});

describe('prepareMcsConnectInitial con inyeccion', () => {
  test('inyecta y deja el connectPDU de GCC coherente con userData+14', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, { injectChannels: ['rdpsnd', 'rdpdr'] });

    assertLengthsCoherent(res.buf);
    assert.deepEqual(findClientNetworkChannels(res.buf), ['cliprdr', 'rdpsnd', 'rdpdr']);

    const duca = res.buf.indexOf(Buffer.from('Duca'));
    const userDataLen = ((res.buf[duca + 4] & 0x3f) << 8) | res.buf[duca + 5];
    const oidAt = res.buf.indexOf(Buffer.from([0x00, 0x14, 0x7c, 0x00, 0x01]));
    const connectPduLen = ((res.buf[oidAt + 5] & 0x3f) << 8) | res.buf[oidAt + 6];
    assert.equal(connectPduLen, userDataLen + 14, 'Wallix exige connectPDU == userData + 14');
  });

  // La forma de objeto se descartaba en silencio por un Array.isArray, y la unica senal era que el
  // juego de canales seguia igual en un log donde la inyeccion parecia haberse aplicado
  test('acepta la forma {before, after} y no solo el array', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, {
      injectChannels: { before: ['rdpdr', 'rdpsnd'], after: ['drdynvc'] }
    });

    assert.deepEqual(findClientNetworkChannels(res.buf), ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc']);
    assert.ok(
      res.notes.some((n) => n.includes('canales inyectados')),
      'la inyeccion debe quedar anotada, no descartarse en silencio'
    );
    assertLengthsCoherent(res.buf);
  });

  test('una especificacion de objeto vacia no toca los canales', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, { injectChannels: { before: [], after: [] } });

    assert.deepEqual(findClientNetworkChannels(res.buf), ['cliprdr']);
    assert.equal(res.buf.length, frame.length);
  });

  // Sigue existiendo la puerta de salida para el codigo que no quiera tocar los canales
  test('sin opcion de inyeccion el juego de canales no se toca', () => {
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01);

    assert.deepEqual(findClientNetworkChannels(res.buf), ['cliprdr']);
    assert.equal(res.buf.length, frame.length);
  });
});

// Esto decide el juego de canales de todas las conexiones RDP nativas, no solo las de bastion
describe('juego de canales por defecto del bridge', () => {
  const { resolveInjectedChannels } = require('../../src/main/services/RdpNativeBridgeService');
  const previous = process.env.NODETERM_RDP_INJECT_CHANNELS;

  // El valor se lee tambien de rdp-flags.json, asi que la variable de entorno tiene que ganar
  beforeEach(() => { process.env.NODETERM_RDP_INJECT_CHANNELS = ''; });
  afterEach(() => {
    if (previous === undefined) delete process.env.NODETERM_RDP_INJECT_CHANNELS;
    else process.env.NODETERM_RDP_INJECT_CHANNELS = previous;
  });

  test('por defecto inyecta rdpsnd detras de cliprdr', () => {
    assert.deepEqual(resolveInjectedChannels(), { before: [], after: ['rdpsnd'] });
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, { injectChannels: resolveInjectedChannels() });
    assert.deepEqual(findClientNetworkChannels(res.buf), ['cliprdr', 'rdpsnd']);
  });

  test("'off' deja la conexion sin tocar", () => {
    process.env.NODETERM_RDP_INJECT_CHANNELS = 'off';
    assert.equal(resolveInjectedChannels(), null);
  });

  test('un valor explicito sustituye al juego por defecto', () => {
    process.env.NODETERM_RDP_INJECT_CHANNELS = 'rdpdr,*';
    assert.deepEqual(resolveInjectedChannels(), { before: ['rdpdr'], after: [] });
  });

  test('cadena :APP: inyecta rail, rdpdr y rdpsnd delante de cliprdr', () => {
    const session = { username: 'rt01119@default@FortiAnalyzer:APP:rt01119' };
    assert.deepEqual(resolveInjectedChannels(session), { before: ['rail', 'rdpdr', 'rdpsnd'], after: [] });
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, { injectChannels: resolveInjectedChannels(session) });
    assert.deepEqual(findClientNetworkChannels(res.buf), ['rail', 'rdpdr', 'rdpsnd', 'cliprdr']);
  });

  test('cadena :RDP: inyecta rdpsnd detras de cliprdr', () => {
    const session = { username: 'dsn_operator@WALLIX-JUMPSERVER@ESJC-SGCM-WL03P:RDP:rt01119' };
    assert.deepEqual(resolveInjectedChannels(session), { before: [], after: ['rdpsnd'] });
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, { injectChannels: resolveInjectedChannels(session) });
    assert.deepEqual(findClientNetworkChannels(res.buf), ['cliprdr', 'rdpsnd']);
  });

  test('cadena :RDP: ESAH desplaza cliprdr detras de rdpdr y rdpsnd', () => {
    const session = {
      username: 'dsn_operator@WALLIX-JUMPSERVER@ESAH-SGCM-WL03P:RDP:rt01119',
      targetServer: 'ESAH-SGCM-WL03P'
    };
    assert.deepEqual(resolveInjectedChannels(session), { before: ['rdpdr', 'rdpsnd'], after: [] });
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, { injectChannels: resolveInjectedChannels(session) });
    assert.deepEqual(findClientNetworkChannels(res.buf), ['rdpdr', 'rdpsnd', 'cliprdr']);
  });

  test('targetServer ESAH sin marcador en el usuario tambien desplaza cliprdr', () => {
    assert.deepEqual(
      resolveInjectedChannels({ targetServer: 'ESAH-SGCM-WL03P' }),
      { before: ['rdpdr', 'rdpsnd'], after: [] }
    );
  });

  test('wallixService APP sin marcador en el usuario usa el juego APP', () => {
    assert.deepEqual(
      resolveInjectedChannels({ username: 'rt01119', wallixService: 'APP' }),
      { before: ['rail', 'rdpdr', 'rdpsnd'], after: [] }
    );
  });

  test('el marcador :RDP: gana a wallixService APP', () => {
    assert.deepEqual(
      resolveInjectedChannels({
        username: 'dsn_operator@WALLIX-JUMPSERVER@ESJC-SGCM-WL03P:RDP:rt01119',
        wallixService: 'APP'
      }),
      { before: [], after: ['rdpsnd'] }
    );
  });

  test('NODETERM_RDP_INJECT_CHANNELS gana al juego APP (p.ej. rail delante)', () => {
    process.env.NODETERM_RDP_INJECT_CHANNELS = 'rail,rdpdr,rdpsnd,*';
    assert.deepEqual(
      resolveInjectedChannels({ username: 'rt01119@default@FortiAnalyzer:APP:rt01119' }),
      { before: ['rail', 'rdpdr', 'rdpsnd'], after: [] }
    );
  });

  test('APP_INJECTED_CHANNELS_RAIL es el default APP', () => {
    const { APP_INJECTED_CHANNELS, APP_INJECTED_CHANNELS_RAIL } = require('../../src/main/services/RdpNativeBridgeService');
    assert.deepEqual(APP_INJECTED_CHANNELS, APP_INJECTED_CHANNELS_RAIL);
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000]]);
    const res = prepareMcsConnectInitial(frame, 0x01, { injectChannels: APP_INJECTED_CHANNELS_RAIL });
    assert.deepEqual(findClientNetworkChannels(res.buf), ['rail', 'rdpdr', 'rdpsnd', 'cliprdr']);
    assert.deepEqual(resolveInjectedChannels({ username: 'x@d@h:APP:u' }), { before: ['rail', 'rdpdr', 'rdpsnd'], after: [] });
  });
});

describe('marcador de servicio Wallix en la cadena', () => {
  const { wallixServiceFromUsername, wallixServiceFromSession } = require('../../src/main/services/RdpNativeBridgeService');

  test('extrae APP y RDP de la cadena', () => {
    assert.equal(wallixServiceFromUsername('rt01119@default@FortiAnalyzer:APP:rt01119'), 'APP');
    assert.equal(wallixServiceFromUsername('dsn_operator@WALLIX-JUMPSERVER@ESJC-SGCM-WL03P:RDP:rt01119'), 'RDP');
    assert.equal(wallixServiceFromUsername('rt01119'), null);
  });

  test('la sesion prefiere el marcador del usuario al campo wallixService', () => {
    assert.equal(
      wallixServiceFromSession({
        username: 'user@default@host:RDP:u',
        wallixService: 'APP'
      }),
      'RDP'
    );
  });
});
