import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/http";

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
