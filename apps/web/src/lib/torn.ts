import { round2, seeded } from "./rng";

type Rand = () => number;

// How far (in px) an edge sits inside the box at each sample point: a slow wobble, fine
// fibre-like jitter, and the occasional deeper bite, like a tear in paper.
function edge(rand: Rand, count: number, wobble: number, jitter: number, biteChance: number, bite: number) {
  const knots = 6;
  const ks = Array.from({ length: knots + 1 }, rand);
  const d = Array.from({ length: count }, (_, i) => {
    const f = (i / count) * knots;
    const k = Math.floor(f);
    const m = (1 - Math.cos((f - k) * Math.PI)) / 2;
    const slow = ks[k] * (1 - m) + ks[k + 1] * m;
    return slow * wobble + rand() * jitter;
  });
  for (let i = 0; i < count; i++) {
    if (rand() > biteChance) continue;
    const width = 1 + Math.floor(rand() * 3);
    const depth = bite * (0.5 + rand() * 0.5);
    for (let j = 0; j < width && i + j < count; j++) {
      d[i + j] += depth * (1 - Math.abs(j - (width - 1) / 2) / width);
    }
  }
  return d;
}

// Sample positions along an edge, nudged so spacing is uneven (a ruler-straight pitch looks fake).
// Never exactly on 0% or 100%, so corners come out as torn corners rather than sharp ones.
function stops(rand: Rand, count: number) {
  return Array.from({ length: count }, (_, i) => round2(((i + 0.5 + (rand() - 0.5) * 0.7) / count) * 100));
}

function outline(rand: Rand, w: number, h: number) {
  // About one point every 6px along each side.
  const nx = Math.round(w / 6);
  const ny = Math.round(h / 6);
  const top = edge(rand, nx, 7, 3.2, 0.1, 9);
  const right = edge(rand, ny, 7, 3.2, 0.1, 9);
  const bottom = edge(rand, nx, 7, 3.2, 0.1, 9);
  const left = edge(rand, ny, 7, 3.2, 0.1, 9);
  const tx = stops(rand, nx);
  const ty = stops(rand, ny);
  const px = (v: number) => `${round2(v)}px`;
  const pts: string[] = [];
  for (let i = 0; i < nx; i++) pts.push(`${tx[i]}% ${px(top[i])}`);
  for (let i = 0; i < ny; i++) pts.push(`calc(100% - ${px(right[i])}) ${ty[i]}%`);
  for (let i = 0; i < nx; i++) pts.push(`${round2(100 - tx[i])}% calc(100% - ${px(bottom[i])})`);
  for (let i = 0; i < ny; i++) pts.push(`${px(left[i])} ${round2(100 - ty[i])}%`);
  return `polygon(${pts.join(",")})`;
}

const cache = new Map<string, string>();

// A ripped outline for one photo, as a CSS clip-path. Deterministic per seed. The torn edge is
// the photo itself: whatever sits behind it (the page background) shows through the tears.
export function tornEdge(seed: number, width = 260, height = 390) {
  const key = `${seed}:${width}x${height}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = outline(seeded(seed), width, height);
    cache.set(key, hit);
  }
  return hit;
}
