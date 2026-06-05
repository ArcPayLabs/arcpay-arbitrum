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
      skill: "https://workos.com/auth.md",
      register_uri: `${origin}/agent/auth`,
      claim_uri: `${origin}/agent/auth/claim`,
      claim_complete_uri: `${origin}/agent/auth/claim/complete`,
      revocation_uri: `${origin}/agent/auth/revoke`,
      identity_types_supported: ["anonymous", "identity_assertion"],
      anonymous: {
        credential_types_supported: ["api_key"],
      },
      identity_assertion: {
        assertion_types_supported: [
          "urn:ietf:params:oauth:token-type:id-jag",
          "verified_email",
        ],
        credential_types_supported: ["access_token", "api_key"],
      },
      events_supported: [
        "https://schemas.workos.com/events/agent/auth/identity/assertion/revoked",
      ],
      protected_resource_metadata: `${origin}/.well-known/oauth-protected-resource`,
      instructions: `${origin}/auth.md`,
    },
    service_documentation: `${origin}/docs/overview`,
  });
}
