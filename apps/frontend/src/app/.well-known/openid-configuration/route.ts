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
      "openid",
      "profile",
      "wallet:read",
      "workspace:read",
      "mcp:read",
      "mcp:tools",
      "x402:read",
      "records:read",
      "records:write",
    ],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["ES256", "RS256"],
    service_documentation: `${origin}/docs/overview`,
  });
}
