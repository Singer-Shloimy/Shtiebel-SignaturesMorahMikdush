const SIGNATURE_FAMILY = "Gveret Levin";

function resolveSignatureFontFamily(): string {
  if (typeof document === "undefined") return SIGNATURE_FAMILY;
  const probe = document.createElement("span");
  probe.style.fontFamily = `var(--font-signature), "${SIGNATURE_FAMILY}", serif`;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || `"${SIGNATURE_FAMILY}"`;
  probe.remove();
  return family;
}

async function ensureFontReady(family: string, size: number) {
  if (!document.fonts?.load) return;
  try {
    await document.fonts.load(`${size}px ${family}`);
    await document.fonts.ready;
  } catch {
    // Canvas can still draw with a fallback if load() rejects.
  }
}

/** Render printed name as a PNG data URL (transparent background, handwriting style). */
export async function nameToSignaturePng(
  text: string,
  cssWidth: number,
  cssHeight: number,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("empty");
  }

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(cssWidth * ratio));
  canvas.height = Math.max(1, Math.floor(cssHeight * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const family = resolveSignatureFontFamily();
  let fontSize = Math.min(46, Math.floor(cssHeight * 0.62));
  await ensureFontReady(family, fontSize);

  const measure = (size: number) => {
    ctx.font = `${size}px ${family}`;
    return ctx.measureText(trimmed).width;
  };

  while (fontSize > 16 && measure(fontSize) > cssWidth - 24) {
    fontSize -= 2;
  }

  ctx.font = `${fontSize}px ${family}`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";

  ctx.save();
  ctx.translate(cssWidth / 2, cssHeight / 2 + 2);
  ctx.rotate(-0.08);
  ctx.fillText(trimmed, 0, 0);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
