import { promises as fs } from "fs";
import path from "path";
import { SIGNERS } from "@/data/signers";
import { dataDir } from "@/lib/paths";

export type SignerStatus = "pending" | "esigned" | "in_person";

export type SignerRecord = {
  slug: string;
  name: string;
  status: SignerStatus;
  signedAt?: string;
  signatureFile?: string;
};

export type StoreData = {
  signers: Record<string, SignerRecord>;
  inPersonFiles: string[];
};

function storePath() {
  return path.join(dataDir(), "store.json");
}

export function signaturesDir() {
  return path.join(dataDir(), "signatures");
}

export function uploadsDir() {
  return path.join(dataDir(), "uploads");
}

function emptyStore(): StoreData {
  const signers: Record<string, SignerRecord> = {};
  for (const s of SIGNERS) {
    signers[s.slug] = {
      slug: s.slug,
      name: s.name,
      status: "pending",
    };
  }
  return { signers, inPersonFiles: [] };
}

async function ensureDirs() {
  await fs.mkdir(signaturesDir(), { recursive: true });
  await fs.mkdir(uploadsDir(), { recursive: true });
}

export async function readStore(): Promise<StoreData> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    const base = emptyStore();
    for (const slug of Object.keys(base.signers)) {
      if (parsed.signers?.[slug]) {
        base.signers[slug] = { ...base.signers[slug], ...parsed.signers[slug] };
      }
    }
    base.inPersonFiles = parsed.inPersonFiles ?? [];
    return base;
  } catch {
    const store = emptyStore();
    await writeStore(store);
    return store;
  }
}

export async function writeStore(store: StoreData) {
  await ensureDirs();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function saveSignaturePng(slug: string, dataUrl: string) {
  await ensureDirs();
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const fileName = `${slug}.png`;
  const filePath = path.join(signaturesDir(), fileName);
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  return fileName;
}

export async function saveUpload(fileName: string, buffer: Buffer) {
  await ensureDirs();
  const safe = fileName.replace(/[^\w.\-()\u0590-\u05FF]+/g, "_");
  const unique = `${Date.now()}-${safe}`;
  const filePath = path.join(uploadsDir(), unique);
  await fs.writeFile(filePath, buffer);
  return unique;
}
