import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { round2 as n, seeded } from "../lib/rng";
import { useDefsId } from "../lib/useDefsId";

// One flower, used everywhere (corner garlands, the RSVP card, the opening animation) so they all
// match: a rose seen from above, in pale slate blue.

// Gradients live inside each host <svg>: one in a display:none <svg> would not render.
export function FlowerDefs({ id }: { id: string }) {
  // Petals run from a shaded base to a lit tip.
  const petal = (key: string, base: string, mid: string, tip: string) => (
    <linearGradient id={`${id}-${key}`} x1="0.5" y1="1" x2="0.5" y2="0">
      <stop offset="0" stopColor={base} />
      <stop offset="0.5" stopColor={mid} />
      <stop offset="1" stopColor={tip} />
    </linearGradient>
  );
  return (
    <defs>
      {/* Pale slate blue (the page slate #708191, tinted) */}
      {petal("o", "#9cb2c7", "#c9d7e4", "#f1f5f9")}
      {petal("m", "#8aa2b9", "#b8cadb", "#e6eef5")}
      {petal("i", "#7791aa", "#a3bad0", "#d6e3ef")}
      {petal("c", "#6a859f", "#94aec6", "#c6d8e8")}
      {/* Deeper slate, for the heart of some roses (never navy) */}
      {petal("dm", "#5f7690", "#86a0b8", "#b9cadb")}
      {/* Blush pink, for the small blossoms */}
      <radialGradient id={`${id}-p`} cx="0.5" cy="0.25" r="0.74">
        <stop offset="0" stopColor="#fff4f5" />
        <stop offset="0.55" stopColor="#f3c8ce" />
        <stop offset="1" stopColor="#d98fa0" />
      </radialGradient>
      {/* Slate-blue foliage, for the tone-on-tone arrangement */}
      <linearGradient id={`${id}-ls`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#4a6078" />
        <stop offset="1" stopColor="#a6b9cb" />
      </linearGradient>
      {/* Fresh light green leaves, darker at the base */}
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#79a850" />
        <stop offset="1" stopColor="#cbe69c" />
      </linearGradient>
    </defs>
  );
}

// A broad, cupped rose petal pointing up (-y) from the flower's centre, and the lit roll of its rim.
function petalPath(L: number, W: number) {
  return `M0 0C${n(-W * 0.62)} ${n(-L * 0.08)} ${n(-W * 0.7)} ${n(-L * 0.75)} ${n(-W * 0.38)} ${n(-L * 0.95)}C${n(-W * 0.2)} ${n(-L * 1.03)} ${n(W * 0.2)} ${n(-L * 1.03)} ${n(W * 0.38)} ${n(-L * 0.95)}C${n(W * 0.7)} ${n(-L * 0.75)} ${n(W * 0.62)} ${n(-L * 0.08)} 0 0Z`;
}
function rimPath(L: number, W: number) {
  return `M${n(-W * 0.36)} ${n(-L * 0.93)}C${n(-W * 0.18)} ${n(-L * 1.0)} ${n(W * 0.18)} ${n(-L * 1.0)} ${n(W * 0.36)} ${n(-L * 0.93)}`;
}

// Petals spiral out from the heart at the golden angle, each a little larger than the last: the
// way a real rose's petals are arranged. Drawn outermost first so inner petals sit on top.
const GOLDEN = 137.508;

export function Flower({ seed, size, defsId, deep = 0 }: { seed: number; size: number; defsId: string; deep?: number }) {
  // Small roses need fewer petals to read as full: this keeps the arrangement light to draw.
  const count = size > 30 ? 20 : size > 14 ? 15 : 12;
  const petals = useMemo(() => {
    const start = seeded(seed)() * 360;
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 1) / count;
      const len = size * (0.22 + 0.78 * t ** 0.9);
      const wid = len * (1.25 - 0.35 * t);
      let g = t > 0.7 ? "o" : t > 0.45 ? "m" : t > 0.25 ? "i" : "c";
      if (deep >= 1 && t <= 0.3) g = "dm";
      return { i, g, rot: n(start + i * GOLDEN), d: petalPath(len, wid), rim: rimPath(len, wid) };
    }).reverse();
  }, [seed, size, deep, count]);
  // The tight spiral at the very heart.
  const swirl = useMemo(() => {
    const pts: string[] = [];
    for (let a = 0; a <= Math.PI * 3.4; a += 0.25) {
      const r = size * 0.016 * a;
      pts.push(`${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)}`);
    }
    return `M${pts.join(" L")}`;
  }, [size]);
  return (
    <g>
      {petals.map((p) => (
        <g key={p.i} transform={`rotate(${p.rot})`}>
          <path d={p.d} fill={`url(#${defsId}-${p.g})`} className="flower-petal" strokeWidth={Math.max(0.2, size * 0.006)} />
          <path d={p.rim} className="flower-rim" strokeWidth={Math.max(0.25, size * 0.01)} />
        </g>
      ))}
      <path d={swirl} className="flower-swirl" strokeWidth={Math.max(0.2, size * 0.008)} />
    </g>
  );
}

export function Leaf({
  x,
  y,
  rot,
  len,
  defsId,
  tone = "leaf",
}: {
  x: number;
  y: number;
  rot: number;
  len: number;
  defsId: string;
  tone?: "leaf" | "ls";
}) {
  const w = len * 0.27;
  const d = `M0 0 C${n(len * 0.2)} ${n(-w * 1.15)} ${n(len * 0.68)} ${n(-w * 1.05)} ${n(len)} 0 C${n(len * 0.68)} ${n(w * 1.05)} ${n(len * 0.2)} ${n(w * 1.15)} 0 0Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={d} fill={`url(#${defsId}-${tone})`} className={tone === "ls" ? "leaf-shape leaf-slate" : "leaf-shape"} strokeWidth={Math.max(0.25, len * 0.012)} />
      <path d={`M0 0 L${n(len * 0.94)} 0`} className="leaf-vein" strokeWidth={Math.max(0.3, len * 0.014)} />
    </g>
  );
}

export function Bud({ x, y, rot, size, defsId }: { x: number; y: number; rot: number; size: number; defsId: string }) {
  const s = size;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path
        d={`M0 0 C${n(-s * 0.55)} ${n(-s * 0.3)} ${n(-s * 0.5)} ${n(-s * 1)} 0 ${n(-s * 1.3)} C${n(s * 0.5)} ${n(-s * 1)} ${n(s * 0.55)} ${n(-s * 0.3)} 0 0Z`}
        fill={`url(#${defsId}-p)`}
        className="blossom-petal"
        strokeWidth={0.4}
      />
      <path
        d={`M0 ${n(-s * 0.1)} C${n(-s * 0.2)} ${n(-s * 0.5)} ${n(-s * 0.15)} ${n(-s * 0.9)} 0 ${n(-s * 1.2)}`}
        className="flower-vein"
        strokeWidth={0.35}
      />
      <path d={`M0 0 L${n(-s * 0.55)} ${n(s * 0.25)} L${n(-s * 0.2)} ${n(-s * 0.1)}Z`} fill={`url(#${defsId}-leaf)`} />
      <path d={`M0 0 L${n(s * 0.55)} ${n(s * 0.25)} L${n(s * 0.2)} ${n(-s * 0.1)}Z`} fill={`url(#${defsId}-leaf)`} />
    </g>
  );
}

// Second flower type: a flat five-petal blossom with notched tips, in blush pink.
function blossomPetal(L: number, W: number) {
  return [
    "M0 0",
    `C${n(-W * 0.55)} ${n(-L * 0.18)} ${n(-W * 0.62)} ${n(-L * 0.8)} ${n(-W * 0.2)} ${n(-L * 0.97)}`,
    `Q${n(-W * 0.08)} ${n(-L * 0.92)} 0 ${n(-L * 0.82)}`,
    `Q${n(W * 0.08)} ${n(-L * 0.92)} ${n(W * 0.2)} ${n(-L * 0.97)}`,
    `C${n(W * 0.62)} ${n(-L * 0.8)} ${n(W * 0.55)} ${n(-L * 0.18)} 0 0Z`,
  ].join(" ");
}

export function Blossom({ seed, size, defsId }: { seed: number; size: number; defsId: string }) {
  const parts = useMemo(() => {
    const rand = seeded(seed);
    const start = rand() * 72;
    const petals = Array.from({ length: 5 }, (_, i) => {
      const len = size * (0.92 + rand() * 0.16);
      return { rot: n(start + i * 72 + (rand() - 0.5) * 10), d: blossomPetal(len, len * (0.86 + rand() * 0.14)) };
    });
    const stamens = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      const r = size * (0.18 + rand() * 0.12);
      return { x: n(Math.cos(a) * r), y: n(Math.sin(a) * r) };
    });
    return { petals, stamens };
  }, [seed, size]);
  return (
    <g>
      {parts.petals.map((p, i) => (
        <path
          key={i}
          d={p.d}
          transform={`rotate(${p.rot})`}
          fill={`url(#${defsId}-p)`}
          className="blossom-petal"
          strokeWidth={Math.max(0.25, size * 0.012)}
        />
      ))}
      <circle r={n(size * 0.12)} fill="#c96d83" />
      {parts.stamens.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={n(size * 0.035)} className="flower-stamen" />
      ))}
      <circle r={n(size * 0.04)} className="flower-pistil" />
    </g>
  );
}

// The arrangement for the RSVP card and the opening animation: a dense, slightly off-centre mass of
// roses in tones of one slate blue, light and deep mixed, over a fan of slate foliage. Back to front.
const FOLIAGE = [
  { x: -30, y: 34, rot: 158, len: 62 },
  { x: 30, y: 34, rot: 22, len: 62 },
  { x: -52, y: 8, rot: 188, len: 52 },
  { x: 52, y: 8, rot: -8, len: 52 },
  { x: -18, y: 52, rot: 118, len: 50 },
  { x: 20, y: 52, rot: 62, len: 50 },
  { x: -44, y: -26, rot: 228, len: 44 },
  { x: 44, y: -26, rot: -48, len: 44 },
];
// size = flower radius; deep darkens the heart. Listed back to front.
const ROSES = [
  { x: -62, y: -20, size: 13, deep: 1, seed: 31 },
  { x: 63, y: -14, size: 12, deep: 0, seed: 32 },
  { x: -10, y: 62, size: 13, deep: 1, seed: 33 },
  { x: 14, y: -62, size: 12, deep: 0, seed: 34 },
  { x: 0, y: -42, size: 21, deep: 0, seed: 21 },
  { x: -52, y: 14, size: 25, deep: 1, seed: 22 },
  { x: 51, y: 12, size: 26, deep: 0, seed: 23 },
  { x: -27, y: 41, size: 25, deep: 0, seed: 24 },
  { x: 28, y: 43, size: 27, deep: 1, seed: 25 },
  { x: -34, y: -22, size: 27, deep: 0, seed: 26 },
  { x: 33, y: -26, size: 28, deep: 1, seed: 27 },
  { x: 0, y: 4, size: 38, deep: 1, seed: 7 },
];

// Each rose, and the foliage, is its own small <svg> laid out in a plain div. The browser draws each
// one once and then only moves/fades that picture, so the opening stays smooth. (Animating shapes
// inside one big SVG would repaint all of it every frame.)
type Part = { style: CSSProperties; box: number };
function place(x: number, y: number, half: number): Part {
  return {
    box: half,
    style: { left: `${n(((x - half + 100) / 200) * 100)}%`, top: `${n(((y - half + 100) / 200) * 100)}%`, width: `${n((half * 2 * 100) / 200)}%` },
  };
}
const ROSE_PARTS = ROSES.map((r) => ({ ...r, ...place(r.x, r.y, r.size * 1.15) }));

export const FlowerBloom = memo(function FlowerBloom({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  const id = useDefsId();
  const part = (style: CSSProperties, delay: number): { className: string; style: CSSProperties } => ({
    className: animate ? "bloom-part bloom-in" : "bloom-part",
    style: animate ? { ...style, "--delay": `${delay}ms` } as CSSProperties : style,
  });
  return (
    <div className={`flower-bloom ${className}`} aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <FlowerDefs id={id} />
      </svg>
      <svg {...part({ left: 0, top: 0, width: "100%" }, 250)} viewBox="-100 -100 200 200">
        {FOLIAGE.map((l, i) => (
          <Leaf key={i} {...l} defsId={id} tone="ls" />
        ))}
      </svg>
      {ROSE_PARTS.map((r, i) => (
        <svg key={r.seed} {...part(r.style, 600 + i * 130)} viewBox={`${-r.box} ${-r.box} ${r.box * 2} ${r.box * 2}`}>
          <Flower seed={r.seed} size={r.size} defsId={id} deep={r.deep} />
        </svg>
      ))}
    </div>
  );
})
