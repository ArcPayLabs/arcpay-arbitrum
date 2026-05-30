import { readSession, sessionCookie } from "./session";

export type ServerSession = {
  address: string;
};

export function sessionFromRequest(request: Request): ServerSession | null {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.match(new RegExp(`${sessionCookie}=([^;]+)`))?.[1];
  return readSession(value);
}

export function adminAddressSet() {
  return new Set(
    String(process.env.ARCPAY_ADMIN_WALLETS ?? process.env.NEXT_PUBLIC_ARCPAY_ADMIN_WALLETS ?? "")
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function requireSession(request: Request) {
  return sessionFromRequest(request);
}

export function requireAdmin(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return null;
  const admins = adminAddressSet();
  if (!admins.size && process.env.NODE_ENV !== "production") return session;
  return admins.has(session.address.toLowerCase()) ? session : null;
}

export function forbidden(message = "forbidden") {
  return Response.json({ ok: false, error: message }, { status: 403 });
}

export function unauthorized(message = "unauthorized") {
  return Response.json({ ok: false, error: message }, { status: 401 });
}
