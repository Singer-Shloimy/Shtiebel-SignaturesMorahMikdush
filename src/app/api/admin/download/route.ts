import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { buildMergedPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const bytes = await buildMergedPdf();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="Shtiebel-SignaturesMorahMikdush-merged.pdf"',
    },
  });
}
