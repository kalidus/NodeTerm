const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

const mlkem768 = require('../../src/utils/pqc/mlkem768');
const sntrup761 = require('../../src/utils/pqc/sntrup761');
const { registerSsh2PqcKex, PQC_KEX_ALGORITHMS } = require('../../src/utils/pqc/registerSsh2PqcKex');
const {
  buildSshConnectOptions,
  buildSshAlgorithms,
  isLegacyCompatibility,
  isHandshakeOrKexError,
  prioritizeKnownHostKeyAlgorithms,
  appendForwardingFlagsToCacheKey
} = require('../../src/utils/sshConnectOptions');
const { toEncryptedV2 } = require('../../src/shared/vault-blob-encoding');
const { Client, Server } = require('ssh2');

describe('Post-Quantum Cryptography (PQC) - ML-KEM-768 & sntrup761', () => {
  it('ML-KEM-768 keygen, encapsulate, decapsulate roundtrip and implicit rejection', () => {
    const seed = Buffer.alloc(64, 0x3a);
    const m = Buffer.alloc(32, 0x7c);

    const { publicKey, secretKey } = mlkem768.keygen(seed);
    assert.strictEqual(publicKey.length, mlkem768.PUBLIC_KEY_BYTES);
    assert.strictEqual(secretKey.length, mlkem768.SECRET_KEY_BYTES);
    // Verify NIST FIPS 203 Keccak/ML-KEM-768 bit-exactness against known vector
    assert.strictEqual(
      crypto.createHash('sha256').update(publicKey).digest('hex'),
      '40682cd6076c0547ac0de83bbd032a8d0ecfc4e304f4d7ba5a415b5fb01cb027'
    );

    const { cipherText, sharedSecret: ssEnc } = mlkem768.encapsulate(publicKey, m);
    assert.strictEqual(cipherText.length, mlkem768.CIPHERTEXT_BYTES);
    assert.strictEqual(ssEnc.length, mlkem768.SHARED_SECRET_BYTES);

    const ssDec = mlkem768.decapsulate(cipherText, secretKey);
    assert.deepStrictEqual(ssDec, ssEnc);

    // Implicit rejection on tampered ciphertext
    const tampered = Buffer.from(cipherText);
    tampered[0] ^= 0xff;
    const ssTampered = mlkem768.decapsulate(tampered, secretKey);
    assert.strictEqual(ssTampered.length, mlkem768.SHARED_SECRET_BYTES);
    assert.notDeepStrictEqual(ssTampered, ssEnc);
  });

  it('sntrup761 keygen, encapsulate, decapsulate roundtrip and implicit rejection', () => {
    const { publicKey, secretKey } = sntrup761.keygen();
    assert.strictEqual(publicKey.length, sntrup761.PUBLIC_KEY_BYTES);
    assert.strictEqual(secretKey.length, sntrup761.SECRET_KEY_BYTES);

    const { cipherText, sharedSecret: ssEnc } = sntrup761.encapsulate(publicKey);
    assert.strictEqual(cipherText.length, sntrup761.CIPHERTEXT_BYTES);
    assert.strictEqual(ssEnc.length, sntrup761.SHARED_SECRET_BYTES);

    const ssDec = sntrup761.decapsulate(cipherText, secretKey);
    assert.deepStrictEqual(ssDec, ssEnc);

    // Implicit rejection on tampered ciphertext
    const tampered = Buffer.from(cipherText);
    tampered[10] ^= 0xff;
    const ssTampered = sntrup761.decapsulate(tampered, secretKey);
    assert.strictEqual(ssTampered.length, sntrup761.SHARED_SECRET_BYTES);
    assert.notDeepStrictEqual(ssTampered, ssEnc);
  });
});

describe('SSH Connect Options - Automatic PQC vs Legacy Compatibility Mode', () => {
  it('negotiates PQC hybrid KEX and 256-bit ciphers first by default (automatic mode)', () => {
    const { connectConfig } = buildSshConnectOptions({
      host: '192.168.10.10',
      port: 22,
      username: 'kalidus',
      password: 'secret'
    });

    assert.strictEqual(isLegacyCompatibility({}), false);
    assert.ok(connectConfig.algorithms);
    assert.strictEqual(connectConfig.algorithms.kex[0], 'mlkem768x25519-sha256');
    assert.strictEqual(connectConfig.algorithms.kex[1], 'sntrup761x25519-sha512@openssh.com');
    assert.strictEqual(connectConfig.algorithms.kex[2], 'sntrup761x25519-sha512');
    // Classical fallback remains in the list so non-PQC and legacy servers negotiate transparently
    assert.ok(connectConfig.algorithms.kex.includes('curve25519-sha256'));
    assert.ok(connectConfig.algorithms.kex.includes('diffie-hellman-group14-sha256'));
    // Legacy SHA1 KEX is at the very end as last-resort fallback after all modern algorithms
    assert.strictEqual(
      connectConfig.algorithms.kex.at(-1),
      'diffie-hellman-group1-sha1'
    );
    assert.strictEqual(connectConfig.reconnect, false);

    // 256-bit quantum-resistant symmetric ciphers first, filtered against runtime SUPPORTED_CIPHER
    assert.strictEqual(connectConfig.algorithms.cipher[0], 'aes256-gcm@openssh.com');
    assert.ok(connectConfig.algorithms.cipher.includes('aes256-ctr'));
    const ssh2Constants = require('ssh2/lib/protocol/constants.js');
    for (const cipher of connectConfig.algorithms.cipher) {
      assert.ok(ssh2Constants.SUPPORTED_CIPHER.includes(cipher));
    }
  });

  it('detects handshake/KEX errors for automatic legacy fallback and ignores auth/known_hosts errors', () => {
    assert.strictEqual(isHandshakeOrKexError(new Error('Handshake failed: no matching key exchange algorithm')), true);
    assert.strictEqual(isHandshakeOrKexError(new Error('Handshake failed: signature verification failed')), true);
    assert.strictEqual(isHandshakeOrKexError(Object.assign(new Error('Packet corrupt'), { level: 'handshake' })), true);
    assert.strictEqual(isHandshakeOrKexError(new Error('Handshake failed: Host denied (verification failed)')), false);
    assert.strictEqual(isHandshakeOrKexError(new Error('All configured authentication methods failed')), false);
    assert.strictEqual(isHandshakeOrKexError(new Error('connect ECONNREFUSED 192.168.1.50:22')), false);
  });

  it('prioritizes the host key algorithm already recorded in known_hosts to prevent key-type mismatches', () => {
    const algos = buildSshAlgorithms({});
    const reorderedEcdsa = prioritizeKnownHostKeyAlgorithms(algos, 'ecdsa-sha2-nistp256');
    assert.strictEqual(reorderedEcdsa.serverHostKey[0], 'ecdsa-sha2-nistp256');

    const reorderedRsa = prioritizeKnownHostKeyAlgorithms(algos, 'ssh-rsa');
    assert.strictEqual(reorderedRsa.serverHostKey[0], 'rsa-sha2-512');
    assert.strictEqual(reorderedRsa.serverHostKey[1], 'rsa-sha2-256');
    assert.strictEqual(reorderedRsa.serverHostKey[2], 'ssh-rsa');
  });

  it('switches to legacy compatibility algorithms when legacyCompatibility is true', () => {
    const algos = buildSshAlgorithms({ legacyCompatibility: true });
    assert.strictEqual(isLegacyCompatibility({ legacyCompatibility: true }), true);

    // PQC algorithms are excluded in legacy mode to avoid oversized KEXINIT on old embedded devices
    for (const pqcName of PQC_KEX_ALGORITHMS) {
      assert.ok(!algos.kex.includes(pqcName));
    }
    assert.ok(algos.kex.includes('diffie-hellman-group14-sha1'));
    assert.ok(algos.kex.includes('diffie-hellman-group1-sha1'));
    assert.ok(algos.cipher.includes('aes128-cbc'));
    assert.ok(algos.cipher.includes('3des-cbc'));
    assert.ok(algos.serverHostKey.includes('ssh-rsa'));
    assert.ok(algos.hmac.includes('hmac-sha1'));
  });

  it('supports Bastion Wallix connections with automatic PQC and legacyCompatibility toggle', () => {
    const bastionAuto = buildSshAlgorithms({ useBastionWallix: true });
    assert.strictEqual(bastionAuto.kex[0], 'mlkem768x25519-sha256');
    assert.strictEqual(bastionAuto.kex[1], 'sntrup761x25519-sha512@openssh.com');
    assert.strictEqual(bastionAuto.kex[2], 'sntrup761x25519-sha512');
    // Wallix fallback algorithms remain available at the end of the list
    assert.ok(bastionAuto.kex.includes('curve25519-sha256'));
    assert.ok(bastionAuto.kex.includes('diffie-hellman-group14-sha1'));
    assert.ok(bastionAuto.kex.includes('diffie-hellman-group1-sha1'));
    assert.strictEqual(bastionAuto.cipher[0], 'aes256-gcm@openssh.com');

    const bastionLegacy = buildSshAlgorithms({ useBastionWallix: true, legacyCompatibility: true });
    for (const pqcName of PQC_KEX_ALGORITHMS) {
      assert.ok(!bastionLegacy.kex.includes(pqcName));
    }
    assert.ok(bastionLegacy.kex.includes('diffie-hellman-group14-sha1'));
    assert.ok(bastionLegacy.kex.includes('diffie-hellman-group1-sha1'));
  });

  it('includes legacyCompatibility flag in connection cache key', () => {
    const keyDefault = appendForwardingFlagsToCacheKey('h:22:u', { legacyCompatibility: false });
    const keyLegacy = appendForwardingFlagsToCacheKey('h:22:u', { legacyCompatibility: true });
    assert.notStrictEqual(keyDefault, keyLegacy);
    assert.ok(keyLegacy.endsWith('|legacy:1'));
  });

  it('preserves optional kdf and iterations metadata in toEncryptedV2', () => {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const data = crypto.randomBytes(32);
    const encoded = toEncryptedV2({
      salt,
      iv,
      data,
      kdf: 'pbkdf2-sha512',
      iterations: 210000
    });
    assert.strictEqual(encoded.v, 2);
    assert.strictEqual(encoded.kdf, 'pbkdf2-sha512');
    assert.strictEqual(encoded.iterations, 210000);
  });

  it('completes full SSH2 handshake with mlkem768x25519-sha256 and sntrup761x25519-sha512@openssh.com', async () => {
    registerSsh2PqcKex();
    const { privateKey: hostKeyPem } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });

    for (const kexAlgo of ['mlkem768x25519-sha256', 'sntrup761x25519-sha512@openssh.com']) {
      await new Promise((resolve, reject) => {
        const srv = new Server({
          hostKeys: [hostKeyPem],
          algorithms: { kex: [kexAlgo] }
        }, (client) => {
          client.on('authentication', (ctx) => ctx.accept());
          client.on('ready', () => {
            client.on('session', (accept) => {
              const session = accept();
              session.on('exec', (acceptExec) => {
                const stream = acceptExec();
                stream.write(`ok:${kexAlgo}`);
                stream.exit(0);
                stream.end();
              });
            });
          });
        });

        srv.listen(0, '127.0.0.1', () => {
          const port = srv.address().port;
          const cli = new Client();
          let output = '';
          cli.on('ready', () => {
            cli.exec('test', (err, stream) => {
              if (err) {
                srv.close();
                return reject(err);
              }
              stream.on('data', (d) => { output += d.toString(); });
              stream.on('close', () => {
                cli.end();
                srv.close();
                try {
                  assert.strictEqual(output, `ok:${kexAlgo}`);
                  resolve();
                } catch (assertErr) {
                  reject(assertErr);
                }
              });
            });
          });
          cli.on('error', (err) => {
            srv.close();
            reject(err);
          });
          cli.connect({
            host: '127.0.0.1',
            port,
            username: 'test',
            password: 'pw',
            algorithms: { kex: [kexAlgo] }
          });
        });
      });
    }
  });
});
