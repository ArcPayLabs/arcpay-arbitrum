import { NextResponse } from "next/server";
import { verifyMessage } from "ethers";
import { createSupabaseAdminClient } from "../../../supabase-server";
import { challengeCookie, createSession, readChallenge, sessionCookie, sessionTtlSeconds } from "@arbitrum/lib/server/session";

export async function POST(request: Request) {
  const body = await request.json();
  const challenge = readChallenge(request.headers.get("cookie")?.match(/arcpay_arbitrum_challenge=([^;]+)/)?.[1]);
  if (!challenge) {
    return NextResponse.json({ error: "challenge_expired" }, { status: 401 });
  }
  const recovered = verifyMessage(challenge.message, String(body.signature ?? "")).toLowerCase();
  if (recovered !== challenge.address) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  const walletEmail = `wallet-${recovered.slice(2)}@arcpay.local`;
  const admin = createSupabaseAdminClient();
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: walletEmail,
    options: {
      data: {
        name: `Arbitrum ${recovered.slice(0, 6)}`,
        wallet_address: recovered,
        workspace: "Arbitrum agent treasury",
      },
    },
  });

  if (error || !link.properties?.hashed_token) {
    return NextResponse.json({ error: error?.message ?? "wallet_supabase_link_failed" }, { status: 500 });
  }

  const response = NextResponse.json({
    address: recovered,
    supabaseAuth: {
      email: walletEmail,
      tokenHash: link.properties.hashed_token,
      type: "email",
    },
  });
  response.cookies.set(sessionCookie, createSession(recovered), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionTtlSeconds,
    path: "/",
  });
  response.cookies.delete(challengeCookie);
  return response;
}
