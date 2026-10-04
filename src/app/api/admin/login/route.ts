import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, getAdminPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { password?: string };
  if (body.password !== getAdminPassword()) {
    return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), getAdminPassword(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
