import { NextResponse } from "next/server";

const origin = "https://arcpay-arbitrum.vercel.app";

export function GET() {
  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/sign-in`,
    token_endpoint: `${origin}/api/auth/verify`,
    jwks_uri: `${origin}/.well-known/jwks.json`,
    registration_endpoint: `${origin}/developer-access`,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "urn:ietf:params:oauth:grant-type:token-exchange",
    ],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "private_key_jwt"],
    scopes_supported: [
      "wallet:read",
      "workspace:read",
      "mcp:read",
      "mcp:tools",
      "x402:read",
      "records:read",
      "records:write",
    ],
    code_challenge_methods_supported: ["S256"],
    agent_auth: {
      register_uri: `${origin}/developer-access`,
      claim_uri: `${origin}/onboard`,
      revocation_uri: `${origin}/developer-access`,
      supported_identity_types: ["wallet", "email_workspace", "mcp_bearer_key", "claim_code"],
      credential_types: ["evm_wallet_signature", "mcp_bearer_token", "agent_claim_code"],
      protected_resource_metadata: `${origin}/.well-known/oauth-protected-resource`,
      instructions: `${origin}/auth.md`,
    },
    service_documentation: `${origin}/docs/overview`,
  });
}
