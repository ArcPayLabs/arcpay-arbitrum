import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    registration_id: `claim-${crypto.randomUUID()}`,
    status: "initiated",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
}
