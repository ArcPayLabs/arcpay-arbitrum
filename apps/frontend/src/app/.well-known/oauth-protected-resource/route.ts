import { NextResponse } from "next/server";

const origin = "https://arcpay-arbitrum.vercel.app";

export function GET() {
  return NextResponse.json({
    resource: origin,
    authorization_servers: [`${origin}/.well-known/oauth-authorization-server`],
    bearer_methods_supported: ["header"],
    scopes_supported: [
      "wallet:read",
      "workspace:read",
      "mcp:read",
      "mcp:tools",
      "x402:read",
      "records:read",
      "records:write",
    ],
    resource_documentation: `${origin}/docs/overview`,
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
    },
    protected_resources: [
      `${origin}/api/mcp`,
      `${origin}/api/developer/tools`,
      `${origin}/api/x402/resource/research-agent`,
    ],
  });
}
