import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    registration_id: `claim-${crypto.randomUUID()}`,
    status: "claimed",
  });
}
