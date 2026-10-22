import { booth } from "./config";

export type FilterId = "frame" | "color";

export const FILTERS: { id: FilterId; label: string; hint: string }[] = [
  { id: "frame", label: "Frame", hint: "Wedding frame with our names" },
  { id: "color", label: "Warm Film", hint: "Soft, warm vintage tones" },
];

// Live-preview approximation of applyWarmFilm (CSS filters work on <video> in every browser).
export const WARM_PREVIEW_CSS = "sepia(.35) contrast(.95) brightness(1.05)";

// Pixel-level version for the captured photo. CanvasRenderingContext2D.filter isn't supported
// in Safari, so the grade is computed by hand to look the same on iPhones.
export function applyWarmFilm(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const k = 0.35;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const sr = 0.393 * r + 0.769 * g + 0.189 * b;
    const sg = 0.349 * r + 0.686 * g + 0.168 * b;
    const sb = 0.272 * r + 0.534 * g + 0.131 * b;
    d[i] = grade(r * (1 - k) + sr * k);
    d[i + 1] = grade(g * (1 - k) + sg * k);
    d[i + 2] = grade(b * (1 - k) + sb * k);
  }
  ctx.putImageData(img, 0, 0);
}

function grade(v: number) {
  const contrasted = (v - 128) * 0.95 + 128;
  return Math.max(0, Math.min(255, contrasted * 1.05));
}

// Drawn the same way for the live overlay and the final photo, so what guests see is what's saved.
export function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ivory = "rgba(251, 243, 222, 0.95)";
  const gold = "rgba(230, 211, 173, 0.9)";

  const shade = ctx.createLinearGradient(0, h * 0.62, 0, h);
  shade.addColorStop(0, "rgba(33, 40, 48, 0)");
  shade.addColorStop(1, "rgba(33, 40, 48, 0.72)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  const m = w * 0.045;
  ctx.strokeStyle = ivory;
  ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  const m2 = m + w * 0.016;
  ctx.strokeStyle = gold;
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.strokeRect(m2, m2, w - m2 * 2, h - m2 * 2);

  const s = w * 0.02;
  ctx.fillStyle = gold;
  for (const [x, y] of [[w / 2, m], [w / 2, h - m], [m, h / 2], [w - m, h / 2]]) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ivory;
  ctx.font = `italic 400 ${w * 0.085}px "Playfair Display", Georgia, serif`;
  ctx.fillText(booth.coupleNames, w / 2, h - m2 - w * 0.13, w - m2 * 4);
  ctx.font = `500 ${w * 0.03}px Montserrat, sans-serif`;
  ctx.fillStyle = gold;
  ctx.fillText(spaced(`${booth.dateLabel}   ${booth.hashtag}`), w / 2, h - m2 - w * 0.065, w - m2 * 4);
}

// Canvas letterSpacing isn't available everywhere; thin spaces give a similar tracked look.
function spaced(text: string) {
  return text.split("").join(" ");
}

export async function loadFrameFonts() {
  await Promise.all([
    document.fonts.load('italic 400 40px "Playfair Display"'),
    document.fonts.load("500 20px Montserrat"),
  ]);
}
