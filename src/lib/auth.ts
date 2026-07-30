import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "tfgen_session";

function getSecret() {
  const secret = process.env.TFGEN_SECRET || process.env.TFGEN_PASSWORD || "dev-secret";
  return secret;
}

async function getHmacKey() {
  return globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(value: string): Promise<string> {
  const key = await getHmacKey();
  const sigBuffer = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(sigBuffer).toString("hex");
}

export async function createSessionToken(): Promise<string> {
  const payload = `ok:${Date.now()}`;
  const sig = await sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64");
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [payload, sig] = decoded.split(".");
    if (!payload || !sig) return false;
    const expectedSig = await sign(payload);
    return expectedSig === sig;
  } catch {
    return false;
  }
}

export function checkPassword(password: string): boolean {
  const expected = process.env.TFGEN_PASSWORD || "";
  if (!expected) return false;
  // comparaison à temps constant
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export async function isAuthenticated(): Promise<boolean> {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
