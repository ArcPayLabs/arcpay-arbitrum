import { NextResponse } from "next/server";

const body = `# Auth.md - ArcPay Arbitrum auth

ArcPay supports wallet-first operator access and hosted MCP developer keys.

## Human operators

1. Open https://arcpay-arbitrum.vercel.app/sign-in
2. Connect an EVM wallet on Arbitrum Sepolia or use an existing email workspace.
3. Create or resume a workspace before opening the dashboard.

## Agent and MCP clients

Agent registration is supported through ArcPay workspace onboarding, scoped MCP developer keys, and claim-code based agent onboarding.

### Agent registration

ArcPay supports the auth.md agent registration pattern for agent onboarding.

Supported flows:

- Agent verified flow: 'identity_assertion' with 'urn:ietf:params:oauth:token-type:id-jag'.
- User claimed flow: 'anonymous' pre-claim registration followed by claim-code or workspace ownership.

Endpoints:

- register_uri: https://arcpay-arbitrum.vercel.app/agent/auth
- claim_uri: https://arcpay-arbitrum.vercel.app/agent/auth/claim
- claim_complete_uri: https://arcpay-arbitrum.vercel.app/agent/auth/claim/complete
- revocation_uri: https://arcpay-arbitrum.vercel.app/agent/auth/revoke
- Protected Resource Metadata: https://arcpay-arbitrum.vercel.app/.well-known/oauth-protected-resource

Supported identity and credential types:

~~~json
{
  "identity_types_supported": ["anonymous", "identity_assertion"],
  "credential_types_supported": ["api_key", "access_token"],
  "assertion_types_supported": [
    "urn:ietf:params:oauth:token-type:id-jag",
    "verified_email"
  ]
}
~~~

Operator flow:

6. Open Developer Access inside the dashboard.
7. Create a scoped MCP key.
8. Call https://arcpay-arbitrum.vercel.app/api/mcp with Authorization: Bearer <key>.

Public read-only discovery endpoints include /openapi.json, /llms.txt, /.well-known/api-catalog, /.well-known/mcp/server-card.json, and /.well-known/agent-skills/index.json.
`;

export function GET() {
  return new NextResponse(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
