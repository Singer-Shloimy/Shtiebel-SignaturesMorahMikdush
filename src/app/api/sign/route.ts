import { NextRequest, NextResponse } from "next/server";
import { getSignerBySlug } from "@/data/signers";
import { readStore, saveSignaturePng, writeStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { slug?: string; signatureDataUrl?: string };
  const slug = body.slug?.trim();
  const signatureDataUrl = body.signatureDataUrl;

  if (!slug || !signatureDataUrl?.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const signer = getSignerBySlug(slug);
  if (!signer) {
    return NextResponse.json({ error: "שם לא נמצא" }, { status: 404 });
  }

  const store = await readStore();
  const record = store.signers[signer.slug];
  if (!record) {
    return NextResponse.json({ error: "שם לא נמצא" }, { status: 404 });
  }

  if (record.status !== "pending") {
    return NextResponse.json(
      { error: "כבר נחתם", status: record.status },
      { status: 409 },
    );
  }

  const fileName = await saveSignaturePng(signer.slug, signatureDataUrl);
  record.status = "esigned";
  record.signedAt = new Date().toISOString();
  record.signatureFile = fileName;
  store.signers[signer.slug] = record;
  await writeStore(store);

  return NextResponse.json({ ok: true });
}
