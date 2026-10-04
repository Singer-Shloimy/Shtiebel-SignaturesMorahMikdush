import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, PDFPage } from "pdf-lib";
import signatureLayout from "@/data/signature-layout.json";
import { letterPath } from "@/lib/paths";
import { inkOnlyPng } from "@/lib/signature-image";
import { readStore, signaturesDir, uploadsDir } from "@/lib/store";

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const layout = signatureLayout as Record<string, LayoutEntry>;
const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;

async function loadBaseDocument(): Promise<{
  pdf: PDFDocument;
  page: PDFPage;
}> {
  const store = await readStore();
  const latestUpload = store.inPersonFiles.length
    ? store.inPersonFiles[store.inPersonFiles.length - 1]
    : null;

  // Prefer the scanned in-person letter as the single base page.
  if (latestUpload) {
    const full = path.join(uploadsDir(), latestUpload);
    const bytes = await fs.readFile(full);
    const lower = latestUpload.toLowerCase();

    if (lower.endsWith(".pdf")) {
      const uploaded = await PDFDocument.load(bytes);
      const pdf = await PDFDocument.create();
      const [copied] = await pdf.copyPages(uploaded, [0]);
      pdf.addPage(copied);
      return { pdf, page: pdf.getPages()[0] };
    }

    if (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg")
    ) {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
      let image;
      try {
        image = await pdf.embedPng(bytes);
      } catch {
        image = await pdf.embedJpg(bytes);
      }
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: LETTER_WIDTH,
        height: LETTER_HEIGHT,
      });
      return { pdf, page };
    }
  }

  const letterBytes = await fs.readFile(letterPath());
  const pdf = await PDFDocument.load(letterBytes);
  return { pdf, page: pdf.getPages()[0] };
}

export async function buildMergedPdf(): Promise<Uint8Array> {
  const store = await readStore();
  const { pdf, page } = await loadBaseDocument();

  const scaleX = page.getWidth() / LETTER_WIDTH;
  const scaleY = page.getHeight() / LETTER_HEIGHT;

  const esigned = Object.values(store.signers).filter(
    (s) => s.status === "esigned" && s.signatureFile,
  );

  for (const signer of esigned) {
    const spot = layout[signer.slug];
    if (!spot) continue;

    try {
      const raw = await fs.readFile(
        path.join(signaturesDir(), signer.signatureFile!),
      );
      const imgBytes = inkOnlyPng(raw);
      const img = await pdf.embedPng(imgBytes);
      const boxW = spot.width * scaleX;
      const boxH = spot.height * scaleY;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, {
        x: spot.x * scaleX + (boxW - w) / 2,
        y: spot.y * scaleY + Math.max(0, (boxH - h) / 2),
        width: w,
        height: h,
      });
    } catch {
      // skip missing image
    }
  }

  return pdf.save();
}
