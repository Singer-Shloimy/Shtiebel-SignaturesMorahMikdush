import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { letterPath } from "@/lib/paths";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const bytes = await fs.readFile(letterPath());

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="letter.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
