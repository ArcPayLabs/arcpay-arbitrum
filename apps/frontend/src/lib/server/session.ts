import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "arcpay_arbitrum_session";
const CHALLENGE_COOKIE = "arcpay_arbitrum_challenge";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const CHALLENGE_TTL_SECONDS = 5 * 60;

function secret() {
  return process.env.ARCPAY_SESSION_SECRET ?? "arcpay-arbitrum-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function encode(payload: Record<string, unknown>, ttlSeconds: number) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function createChallenge(address: string) {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const message = [
    "ArcPay Arbitrum wallet login",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    "Chain ID: 421614",
  ].join("\n");
  return {
    message,
    cookie: encode({ address: address.toLowerCase(), nonce, issuedAt, message }, CHALLENGE_TTL_SECONDS),
  };
}

export function readChallenge(token: string | undefined) {
  return decode<{ address: string; nonce: string; issuedAt: string; message: string }>(token);
}

export function createSession(address: string) {
  return encode({ address: address.toLowerCase() }, SESSION_TTL_SECONDS);
}

export function readSession(token: string | undefined) {
  return decode<{ address: string }>(token);
}

export const sessionCookie = SESSION_COOKIE;
export const challengeCookie = CHALLENGE_COOKIE;
export const sessionTtlSeconds = SESSION_TTL_SECONDS;
export const challengeTtlSeconds = CHALLENGE_TTL_SECONDS;
