import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

function norm(s) {
  return s
    .replace(/["“”״׳']/g, "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s) {
  return norm(s)
    .split(" ")
    .filter(Boolean)
    .filter((t) => t !== ".");
}

function words(s) {
  return tokens(s).slice().sort().join(" ");
}

function prefixMatch(foundName, signerName) {
  const f = tokens(foundName);
  const s = tokens(signerName);
  if (!f.length || f.length > s.length) return false;
  // every found token should be a prefix of some unused signer token
  const used = new Set();
  for (const ft of f) {
    let ok = false;
    for (let i = 0; i < s.length; i++) {
      if (used.has(i)) continue;
      if (s[i] === ft || s[i].startsWith(ft) || ft.startsWith(s[i])) {
        used.add(i);
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }
  return used.size === f.length && f.length >= Math.max(2, s.length - 1);
}

function toSlug(name) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/["“”״׳']/g, "")
    .replace(/[()]/g, "")
    .replace(/-+/g, "-");
}

const data = new Uint8Array(
  fs.readFileSync(path.join("data", "private", "letter.pdf")),
);
const doc = await pdfjs.getDocument({
  data,
  disableFontFace: true,
  useSystemFonts: true,
}).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
const items = content.items
  .filter((i) => i.str && i.str.trim())
  .map((i) => ({
    str: i.str.trim(),
    x: i.transform[4],
    y: i.transform[5],
    w: i.width,
    h: Math.abs(i.transform[0]) || 6.96,
  }));

const lines = items
  .filter((i) => /^_+$/.test(i.str))
  .map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h }));
const texts = items.filter((i) => !/^_+$/.test(i.str) && i.y < 560);
texts.sort((a, b) => b.y - a.y || b.x - a.x);

const used = new Set();
const found = [];
for (let i = 0; i < texts.length; i++) {
  if (used.has(i)) continue;
  const group = [texts[i]];
  used.add(i);
  let changed = true;
  while (changed) {
    changed = false;
    for (let j = 0; j < texts.length; j++) {
      if (used.has(j)) continue;
      const t = texts[j];
      const sameRow = group.some((g) => Math.abs(g.y - t.y) < 3);
      if (!sameRow) continue;
      const minX = Math.min(...group.map((g) => g.x));
      const maxX = Math.max(...group.map((g) => g.x + g.w));
      if (t.x + t.w < minX - 8 || t.x > maxX + 8) continue;
      group.push(t);
      used.add(j);
      changed = true;
    }
  }
  group.sort((a, b) => b.x - a.x);
  const name = group
    .map((g) => g.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const x = Math.min(...group.map((g) => g.x));
  const maxR = Math.max(...group.map((g) => g.x + g.w));
  const y = Math.min(...group.map((g) => g.y));
  let best = null;
  let bestDist = 1e9;
  for (const l of lines) {
    const cx = (x + maxR) / 2;
    const inCol = cx >= l.x - 5 && cx <= l.x + l.w + 5;
    const dy = l.y - y;
    if (inCol && dy >= -2 && dy < 25 && dy < bestDist) {
      best = l;
      bestDist = dy;
    }
  }
  if (!best) continue;
  found.push({
    name,
    nameX: x,
    nameY: y,
    nameW: maxR - x,
    lineX: best.x,
    lineY: best.y,
    lineW: best.w,
  });
}

const ts = fs.readFileSync(path.join("src", "data", "signers.ts"), "utf8");
const block = ts.split("const NAMES = [")[1].split("] as const")[0];
const signerNames = [...block.matchAll(/"([^"]+)"|'([^']+)'/g)].map(
  (m) => m[1] || m[2],
);

const layout = {};
const unmatchedFound = [];
const available = new Set(signerNames);

for (const f of found) {
  if (f.name === ".") continue;
  const fw = words(f.name);
  const candidates = [...available];
  let match = null;
  for (const s of candidates) {
    if (words(s) === fw) {
      match = s;
      break;
    }
  }
  if (!match) {
    let best = null;
    let bestScore = 0;
    for (const s of candidates) {
      const sw = new Set(words(s).split(" "));
      const ff = new Set(fw.split(" "));
      let inter = 0;
      for (const t of ff) if (sw.has(t)) inter++;
      const score = inter / Math.max(sw.size, ff.size);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    if (bestScore >= 0.8) match = best;
  }
  if (!match) {
    match = candidates.find((s) => prefixMatch(f.name, s)) || null;
  }
  if (!match) {
    unmatchedFound.push(f.name);
    continue;
  }
  available.delete(match);
  const slug = toSlug(match);
  const sigW = Math.min(72, f.lineW * 0.68);
  const sigH = 16;
  layout[slug] = {
    name: match,
    x: f.lineX + (f.lineW - sigW) / 2,
    y: f.lineY - 2,
    width: sigW,
    height: sigH,
  };
}

fs.writeFileSync(
  path.join("src", "data", "signature-layout.json"),
  JSON.stringify(layout, null, 2),
);
console.log("mapped", Object.keys(layout).length);
console.log("unmatchedFound", unmatchedFound);
console.log("unmatchedSigners", [...available]);
