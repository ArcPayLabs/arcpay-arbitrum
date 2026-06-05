import { NextRequest, NextResponse } from "next/server";

const origin = "https://arcpay-arbitrum.vercel.app";

export function GET() {
  return NextResponse.json({
    service: "ArcPay Arbitrum agent registration",
    register_uri: `${origin}/agent/auth`,
    claim_uri: `${origin}/agent/auth/claim`,
    claim_complete_uri: `${origin}/agent/auth/claim/complete`,
    revocation_uri: `${origin}/agent/auth/revoke`,
    identity_types_supported: ["anonymous", "identity_assertion"],
    credential_types_supported: ["api_key", "access_token"],
    instructions: `${origin}/auth.md`,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const registrationType = body.type === "identity_assertion" ? "agent-provider" : "anonymous";

  return NextResponse.json(
    {
      registration_id: `arcpay-arbitrum-${crypto.randomUUID()}`,
      registration_type: registrationType,
      credential_type: "api_key",
      credential: "create-a-scoped-key-in-developer-access",
      credential_expires: null,
      claim_uri: `${origin}/agent/auth/claim`,
      scopes: ["mcp:read", "mcp:tools", "x402:read", "records:read"],
      next: "Open Developer Access to issue a real scoped MCP key for production use.",
    },
    { status: 202 },
  );
}
