import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { readStore, saveUpload, writeStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  }

  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  if (!allowed.includes(file.type) && !/\.(pdf|png|jpe?g)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "רק PDF או תמונה (PNG/JPG)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUpload(file.name, buffer);
  const store = await readStore();
  store.inPersonFiles.push(saved);
  await writeStore(store);

  const markSlugs = form.get("markSlugs");
  if (typeof markSlugs === "string" && markSlugs.trim()) {
    const slugs = markSlugs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const slug of slugs) {
      if (store.signers[slug] && store.signers[slug].status === "pending") {
        store.signers[slug].status = "in_person";
        store.signers[slug].signedAt = new Date().toISOString();
      }
    }
    await writeStore(store);
  }

  return NextResponse.json({ ok: true, file: saved });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const body = (await req.json()) as { file?: string };
  if (!body.file) {
    return NextResponse.json({ error: "חסר שם קובץ" }, { status: 400 });
  }

  const store = await readStore();
  store.inPersonFiles = store.inPersonFiles.filter((f) => f !== body.file);
  await writeStore(store);

  return NextResponse.json({ ok: true });
}
