import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "tfgen_session";

function getSecret() {
  const secret = process.env.TFGEN_SECRET || process.env.TFGEN_PASSWORD || "dev-secret";
  return secret;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSessionToken() {
  const payload = `ok:${Date.now()}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64");
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [payload, sig] = decoded.split(".");
    if (!payload || !sig) return false;
    return sign(payload) === sig;
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

export function isAuthenticated(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
