// Signature check of organization rule packs (D-109): an envelope { kid, payload, sig } where payload is the pack's JSON
// text and sig is an Ed25519 signature over its UTF-8 bytes, by a key whose public half was built into this extension.
// WebCrypto only; nothing is fetched.
import { parsePack, type RulePack } from './pack.js';

export interface TrustedKey { kid: string; publicKey: string }

const b64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function verifyEnvelope(x: unknown, keys: readonly TrustedKey[]): Promise<RulePack | null> {
  if (typeof x !== 'object' || x === null) return null;
  const env = x as Record<string, unknown>;
  if (typeof env.kid !== 'string' || typeof env.payload !== 'string' || typeof env.sig !== 'string' || env.payload.length > 512 * 1024) return null;
  const key = keys.find((k) => k.kid === env.kid);
  if (!key) return null;
  try {
    const pub = await crypto.subtle.importKey('raw', b64(key.publicKey), { name: 'Ed25519' }, false, ['verify']);
    const ok = await crypto.subtle.verify({ name: 'Ed25519' }, pub, b64(env.sig), new TextEncoder().encode(env.payload));
    return ok ? parsePack(JSON.parse(env.payload)) : null;
  } catch {
    return null;
  }
}
