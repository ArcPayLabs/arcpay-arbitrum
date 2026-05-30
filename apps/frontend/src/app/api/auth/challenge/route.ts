import { NextResponse } from "next/server";
import { getAddress } from "ethers";
import { challengeCookie, challengeTtlSeconds, createChallenge } from "@arbitrum/lib/server/session";

export async function POST(request: Request) {
  const body = await request.json();
  const address = getAddress(String(body.address ?? ""));
  const challenge = createChallenge(address);
  const response = NextResponse.json({ message: challenge.message });
  response.cookies.set(challengeCookie, challenge.cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: challengeTtlSeconds,
    path: "/",
  });
  return response;
}
