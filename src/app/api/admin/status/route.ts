import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { readStore, writeStore, type SignerStatus } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const store = await readStore();
  const signers = Object.values(store.signers).sort((a, b) =>
    a.name.localeCompare(b.name, "he"),
  );

  const counts = {
    total: signers.length,
    pending: signers.filter((s) => s.status === "pending").length,
    esigned: signers.filter((s) => s.status === "esigned").length,
    in_person: signers.filter((s) => s.status === "in_person").length,
  };

  return NextResponse.json({
    signers,
    inPersonFiles: store.inPersonFiles,
    counts,
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const body = (await req.json()) as {
    slug?: string;
    status?: SignerStatus;
  };

  if (!body.slug || !body.status) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const store = await readStore();
  const record = store.signers[body.slug];
  if (!record) {
    return NextResponse.json({ error: "שם לא נמצא" }, { status: 404 });
  }

  record.status = body.status;
  if (body.status === "in_person") {
    record.signedAt = new Date().toISOString();
  }
  if (body.status === "pending") {
    record.signedAt = undefined;
    record.signatureFile = undefined;
  }
  store.signers[body.slug] = record;
  await writeStore(store);

  return NextResponse.json({ ok: true });
}
