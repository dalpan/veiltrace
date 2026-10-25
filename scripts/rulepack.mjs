// Organization rule packs (D-109): key generation, signing and verification for an organization's security team.
//   node scripts/rulepack.mjs keygen <kid> <out-dir>      → <out-dir>/<kid>.private.pem (keep secret) and <kid>.public.json
//   node scripts/rulepack.mjs sign <pack.json> <kid> <private.pem> > envelope.json
//   node scripts/rulepack.mjs verify <envelope.json> <public.json>
// The public JSON goes into deploy/rulepack-keys.json (an array) before building the managed extension; envelopes go into
// the `rulePacks` browser policy. Offline; nothing is fetched.
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rawPublic = (key) => Buffer.from(key.export({ format: 'jwk' }).x, 'base64url').toString('base64');

export function keygen(kid) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return { privatePem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(), publicKey: { kid, publicKey: rawPublic(publicKey) } };
}

export function signPack(packText, kid, privatePem) {
  JSON.parse(packText);
  const sig = sign(null, Buffer.from(packText, 'utf8'), createPrivateKey(privatePem)).toString('base64');
  return { kid, payload: packText, sig };
}

export function verifyEnvelope(env, pub) {
  const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(pub.publicKey, 'base64').toString('base64url') }, format: 'jwk' });
  return env.kid === pub.kid && verify(null, Buffer.from(env.payload, 'utf8'), key, Buffer.from(env.sig, 'base64'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'keygen' && a && b) {
    const k = keygen(a);
    mkdirSync(b, { recursive: true });
    writeFileSync(join(b, `${a}.private.pem`), k.privatePem, { mode: 0o600 });
    writeFileSync(join(b, `${a}.public.json`), JSON.stringify(k.publicKey, null, 2) + '\n');
    console.log(`wrote ${join(b, `${a}.private.pem`)} (secret) and ${join(b, `${a}.public.json`)}`);
  } else if (cmd === 'sign' && a && b && c) {
    console.log(JSON.stringify(signPack(readFileSync(a, 'utf8'), b, readFileSync(c, 'utf8')), null, 2));
  } else if (cmd === 'verify' && a && b) {
    const ok = verifyEnvelope(JSON.parse(readFileSync(a, 'utf8')), JSON.parse(readFileSync(b, 'utf8')));
    console.log(ok ? 'signature OK' : 'signature INVALID');
    process.exitCode = ok ? 0 : 1;
  } else {
    console.error('usage: rulepack.mjs keygen <kid> <dir> | sign <pack.json> <kid> <private.pem> | verify <envelope.json> <public.json>');
    process.exitCode = 2;
  }
}
