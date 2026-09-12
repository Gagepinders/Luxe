// Uses the global Web Crypto API (not node:crypto) so this same code runs both
// in server actions (Node runtime) and in middleware (Edge runtime).

export const SESSION_COOKIE = "session";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set on this deployment.");
  return secret;
}

async function getKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const str = atob(b64);
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSessionToken(userId: string): Promise<string> {
  const exp = Date.now() + THIRTY_DAYS_MS;
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify({ uid: userId, exp })));
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return `${payloadB64}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;
  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64),
      encoder.encode(payloadB64)
    );
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(payloadB64))) as {
      uid: string;
      exp: number;
    };
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return payload.uid;
  } catch {
    return null;
  }
}
