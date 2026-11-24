// Web Push: payload encrypted for a phone can be decrypted with the phone's keys (RFC 8291),
// and the VAPID signature verifies with the public key (RFC 8292).
const assert = require('assert');
const crypto = require('crypto');
const WP = require('../src/services/webPush');
console.log('--- RUNNING WEB PUSH TESTS ---');

// A fake phone (user agent) key pair + auth secret
const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
const auth = crypto.randomBytes(16);
const msg = JSON.stringify({ title: 'New order GMG-1', body: 'OMR 4.900', url: '/admin/#/orders' });
const blob = WP.encrypt(msg, WP._b64u(ua.getPublicKey()), WP._b64u(auth));

// Decrypt as the phone would
const salt = blob.subarray(0, 16); const idlen = blob[20]; const asPub = blob.subarray(21, 21 + idlen); const ct = blob.subarray(21 + idlen);
const shared = ua.computeSecret(asPub);
const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32));
const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
assert.strictEqual(plain[plain.length - 1], 2, 'last-record delimiter');
assert.strictEqual(plain.subarray(0, -1).toString(), msg);
console.log('✓ Encrypted payload decrypts on the phone side (aes128gcm)');

// VAPID JWT signature
const h = WP.vapidHeader('https://fcm.googleapis.com/fcm/send/abc');
const m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
assert(m, 'vapid header format');
const claims = JSON.parse(WP._unb64u(m[2]).toString());
assert.strictEqual(claims.aud, 'https://fcm.googleapis.com');
const raw = WP._unb64u(m[4]);
const pub = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: WP._b64u(raw.subarray(1, 33)), y: WP._b64u(raw.subarray(33)) }, format: 'jwk' });
assert(crypto.verify('sha256', Buffer.from(`${m[1]}.${m[2]}`), { key: pub, dsaEncoding: 'ieee-p1363' }, WP._unb64u(m[3])), 'VAPID signature verifies');
console.log('✓ VAPID signature verifies with the public key');
console.log('ALL WEB PUSH TESTS PASSED SUCCESSFULLY!');
