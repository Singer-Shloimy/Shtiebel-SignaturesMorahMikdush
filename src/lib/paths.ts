import path from "path";

/** Writable runtime data (signatures, uploads, store). On Railway mount a volume here. */
export function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

/** Original blank letter shipped with the app (not on the volume). */
export function letterPath() {
  return (
    process.env.LETTER_PATH ||
    path.join(process.cwd(), "assets", "letter.pdf")
  );
}
