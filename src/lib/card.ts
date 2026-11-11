import { resize } from "../data/catalogue";
import { SITE_HOST } from "./slug";
import type { Roast, Title } from "./types";

/**
 * Share card renderer. One canvas drawing powers both the on-screen preview and the export,
 * so what people see is exactly what they post. Layout is in CSS pixels at the preview width
 * (Story 300×533, Post 340×340) and scaled up to 1080 wide for export.
 */
export type CardFormat = "story" | "post";
export const CARD_SIZE: Record<CardFormat, { w: number; h: number }> = {
  story: { w: 300, h: 533 },
  post: { w: 340, h: 340 },
};

export interface CardData {
  roast: Roast;
  titles: Title[];
  name?: string;
  slug: string;
}

const SANS = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif`;
const AMBER = "#fcbb00";
const font = (weight: number, size: number) => `${weight} ${size}px ${SANS}`;

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function clampLines(ctx: CanvasRenderingContext2D, lines: string[], maxLines: number, max: number) {
  if (lines.length <= maxLines) return lines;
  const out = lines.slice(0, maxLines);
  let last = out[maxLines - 1];
  while (ctx.measureText(`${last}…`).width > max && last.length) last = last.slice(0, -1).trimEnd();
  out[maxLines - 1] = `${last}…`;
  return out;
}

function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "right" = "left") {
  // Canvas letterSpacing is not everywhere yet, so draw character by character.
  const width = [...text].reduce((a, ch) => a + ctx.measureText(ch).width + spacing, -spacing);
  let cx = align === "right" ? x - width : x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return width;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

/** The single quoted line on the card: the punchiest short line. */
export function cardLine(roast: Roast) {
  const pool = roast.lines.slice(0, 3);
  return [...pool].sort((a, b) => a.text.length - b.text.length).find((l) => l.text.length <= 120)?.text ?? pool[0]?.text ?? "";
}

function drawPoster(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, t: Title, x: number, y: number, w: number, h: number, rank: number) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#2a2112");
    g.addColorStop(1, "#141416");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = font(800, Math.max(7, w / 6.5));
    const lines = clampLines(ctx, wrap(ctx, t.title, w - 8), 4, w - 8);
    lines.forEach((l, i) => ctx.fillText(l, x + 4, y + h - 6 - (lines.length - 1 - i) * (w / 5.5)));
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 5);
  ctx.stroke();
  // rank badge
  const r = Math.min(8, w / 6);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(x + r + 3, y + r + 3, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = font(700, r * 1.15);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(rank), x + r + 3, y + r + 3.5);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export async function drawCard(canvas: HTMLCanvasElement, format: CardFormat, data: CardData, scale: number) {
  const { w: W, h: H } = CARD_SIZE[format];
  const story = format === "story";
  const P = story ? 22 : 18;
  const { roast, name } = data;
  const titles = data.titles.slice(0, story ? 5 : 3);
  const images = await Promise.all(titles.map((t) => loadImage(t.poster ? resize(t.poster, "w342") : "")));

  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = "alphabetic";

  // Surface: rounded, with an amber orb top-left and a white orb bottom-right.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 22);
  ctx.clip();
  ctx.fillStyle = "#070708";
  ctx.fillRect(0, 0, W, H);
  const orb = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  orb(W * 0.1, H * 0.06, W * 0.85, "rgba(252,187,0,0.25)");
  orb(W * 0.95, H * 0.98, W * 0.7, "rgba(255,255,255,0.10)");

  // 1. Wordmark and pill
  let y = P + 12;
  ctx.font = font(800, story ? 15 : 14);
  ctx.fillStyle = "#fff";
  ctx.fillText("movieroast", P, y);
  ctx.fillStyle = AMBER;
  ctx.fillText(".", P + ctx.measureText("movieroast").width, y);
  ctx.font = font(800, 8.5);
  const pillText = "TASTE ROAST";
  const pillW = [...pillText].reduce((a, ch) => a + ctx.measureText(ch).width + 1.4, 0) + 16;
  ctx.strokeStyle = "rgba(252,187,0,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(W - P - pillW + 0.5, y - 13.5, pillW - 1, 19, 9.5);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  tracked(ctx, pillText, W - P - pillW / 2 - (pillW - 16) / 2, y - 1, 1.4);

  // 2. Eyebrow
  y += story ? 34 : 26;
  ctx.font = font(800, 9.5);
  ctx.fillStyle = AMBER;
  const heat = roast.heat.toUpperCase();
  const eyebrow = name ? `${name.toUpperCase()}’S TASTE · ${heat}` : `${heat} HEAT`;
  tracked(ctx, truncate(ctx, eyebrow, W - P * 2 - 20), P, y, 1.6);

  // 3. Verdict
  const vSize = story ? 30 : 22;
  ctx.font = font(900, vSize);
  ctx.fillStyle = "#fff";
  let vLines = wrap(ctx, roast.verdict, W - P * 2);
  let size = vSize;
  if (vLines.length > (story ? 3 : 2)) {
    size = story ? 25 : 19;
    ctx.font = font(900, size);
    vLines = clampLines(ctx, wrap(ctx, roast.verdict, W - P * 2), story ? 4 : 2, W - P * 2);
  }
  y += 10;
  vLines.forEach((l) => {
    y += size * 1.02;
    ctx.fillText(l, P, y);
  });

  // Bottom-up: footer, then the quote box, so they always fit inside the frame.
  const footerY = H - P;
  ctx.font = font(800, 10);
  ctx.fillStyle = "#fff";
  const mt = "movietonight";
  const byW = ctx.measureText("by ").width;
  const mtW = ctx.measureText(mt).width;
  const dotW = ctx.measureText(".").width;
  ctx.font = font(600, 10);
  ctx.fillStyle = "#71717a";
  ctx.fillText("by ", W - P - byW - mtW - dotW, footerY);
  ctx.font = font(800, 10);
  ctx.fillStyle = "#fff";
  ctx.fillText(mt, W - P - mtW - dotW, footerY);
  ctx.fillStyle = AMBER;
  ctx.fillText(".", W - P - dotW, footerY);
  const leftMax = W - P * 2 - (byW + mtW + dotW) - 12;
  ctx.font = font(700, 10);
  ctx.fillStyle = AMBER;
  ctx.fillText(truncate(ctx, `${SITE_HOST}/r/${data.slug}`, leftMax), P, footerY);
  ctx.font = font(600, 10);
  ctx.fillStyle = "#a1a1aa";
  ctx.fillText(truncate(ctx, "Think you can do better? Get roasted", W - P * 2), P, footerY - 14);

  // 6. Quote box
  const quote = `“${cardLine(roast)}”`;
  const qSize = story ? 12.5 : 11.5;
  ctx.font = font(600, qSize);
  const qLines = clampLines(ctx, wrap(ctx, quote, W - P * 2 - 24), story ? 4 : 2, W - P * 2 - 24);
  const qLH = qSize * 1.4;
  const boxH = 12 + 10 + 8 + qLines.length * qLH + 6;
  const boxY = footerY - 14 - 18 - boxH;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.roundRect(P, boxY, W - P * 2, boxH, 12);
  ctx.fill();
  ctx.font = font(800, 7.5);
  ctx.fillStyle = AMBER;
  tracked(ctx, "CONCIERGE VERDICT", P + 12, boxY + 12 + 7, 1.3);
  ctx.font = font(600, qSize);
  ctx.fillStyle = "#e4e4e7";
  qLines.forEach((l, i) => ctx.fillText(l, P + 12, boxY + 12 + 10 + 8 + qLH * (i + 0.75)));

  // 4 + 5. Evidence posters and score, centred in the space left between verdict and quote.
  const top = y + (story ? 18 : 12);
  const bottom = boxY - (story ? 16 : 10);
  const scoreText = String(roast.score);
  const drawScore = (x: number, baseline: number, sizePx: number) => {
    ctx.font = font(900, sizePx);
    const sw = ctx.measureText(scoreText).width;
    if (roast.heat === "savage") {
      const g = ctx.createLinearGradient(x, baseline - sizePx, x + sw, baseline);
      g.addColorStop(0, "#fb7185");
      g.addColorStop(1, "#fbbf24");
      ctx.fillStyle = g;
    } else ctx.fillStyle = "#fff";
    ctx.fillText(scoreText, x - sizePx * 0.04, baseline);
    ctx.font = font(700, sizePx * 0.22);
    ctx.fillStyle = "#52525b";
    ctx.fillText("/100", x + sw + 3, baseline);
    return sw + 3 + ctx.measureText("/100").width;
  };
  const drawType = (x: number, yTop: number, maxW: number, sizePx: number, maxLines: number) => {
    ctx.font = font(800, 7.5);
    ctx.fillStyle = "#71717a";
    tracked(ctx, "TASTE TYPE", x, yTop + 7, 1.3);
    ctx.font = font(800, sizePx);
    ctx.fillStyle = "#fff";
    clampLines(ctx, wrap(ctx, roast.type, maxW), maxLines, maxW).forEach((l, i) => ctx.fillText(l, x, yTop + 9 + sizePx * 1.15 * (i + 1)));
  };

  if (story) {
    const gap = 7;
    const pw = (W - P * 2 - gap * 4) / 5;
    const ph = pw * 1.5;
    const scoreSize = 84;
    const blockH = ph + 18 + scoreSize * 0.78;
    let by = top + Math.max(0, (bottom - top - blockH) / 2);
    titles.forEach((t, i) => drawPoster(ctx, images[i], t, P + i * (pw + gap), by, pw, ph, i + 1));
    by += ph + 18 + scoreSize * 0.76;
    const used = drawScore(P, by, scoreSize);
    const typeX = P + used + 14;
    drawType(typeX, by - scoreSize * 0.62, W - P - typeX, 14, 3);
  } else {
    const gap = 6;
    const gridW = 180;
    const pw = (gridW - gap * 2) / 3;
    const ph = pw * 1.5;
    const by = top + Math.max(0, (bottom - top - ph) / 2);
    titles.forEach((t, i) => drawPoster(ctx, images[i], t, P + i * (pw + gap), by, pw, ph, i + 1));
    const sx = P + gridW + 14;
    drawScore(sx, by + 40, 46);
    drawType(sx, by + 46, W - P - sx, 11.5, 2);
  }

  ctx.restore();
  // Hairline ring
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, W - 1, H - 1, 22);
  ctx.stroke();
}

export async function exportCard(format: CardFormat, data: CardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await drawCard(canvas, format, data, 1080 / CARD_SIZE[format].w);
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png");
    } catch (e) {
      reject(e);
    }
  });
}
