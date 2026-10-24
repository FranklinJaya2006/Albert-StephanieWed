import { useMemo } from "react";
import type { CSSProperties } from "react";
import { round2 as n, seeded } from "../lib/rng";
import { useDefsId } from "../lib/useDefsId";

// One flower, used everywhere (corner garlands, the RSVP card, the opening animation) so they
// all match. Layered, slightly uneven petals, each shaded lit-centre to darker-edge, read as a
// real bloom (peony/ranunculus-like) rather than a flat icon. Light slate blue dominates; deeper slate
// shows up in the middle of some flowers (`deep`) and as the odd single petal, so no two look alike.

// Gradients live inside each host <svg>: one in a display:none <svg> would not render.
export function FlowerDefs({ id }: { id: string }) {
  // Petals: lit in the middle, darker at the edges, so each one reads as a rounded, cupped petal.
  const petal = (key: string, lit: string, mid: string, edge: string) => (
    <radialGradient id={`${id}-${key}`} cx="0.5" cy="0.3" r="0.74">
      <stop offset="0" stopColor={lit} />
      <stop offset="0.55" stopColor={mid} />
      <stop offset="1" stopColor={edge} />
    </radialGradient>
  );
  return (
    <defs>
      {/* Light slate blue (the page's slate #708191, tinted), outer layer to core */}
      {petal("o", "#e9eef3", "#bccad6", "#8697a8")}
      {petal("m", "#dde5ec", "#aebfce", "#7d90a2")}
      {petal("i", "#d0dbe5", "#9fb3c5", "#728496")}
      {petal("c", "#c2cfdb", "#8fa3b6", "#667889")}
      {/* Deeper slate, for the middle of some flowers and the odd petal (never navy) */}
      {petal("dm", "#8a9db0", "#667a8e", "#46566a")}
      {petal("di", "#7e92a6", "#5c7084", "#42515f")}
      {petal("dc", "#72869a", "#546679", "#3c4a58")}
      {/* Blush pink, for the second flower type (Blossom) */}
      {petal("p", "#fff4f5", "#f3c8ce", "#d98fa0")}
      {/* Fresh light green leaves, darker at the base */}
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#79a850" />
        <stop offset="1" stopColor="#cbe69c" />
      </linearGradient>
    </defs>
  );
}

// A petal pointing up (-y), base at the origin: broad shoulders and a softly notched tip.
function petalPath(L: number, W: number) {
  const hw = W / 2;
  return [
    "M0 0",
    `C${n(-hw * 1.05)} ${n(-L * 0.12)} ${n(-hw * 1.28)} ${n(-L * 0.6)} ${n(-hw * 0.72)} ${n(-L * 0.9)}`,
    `C${n(-hw * 0.46)} ${n(-L * 1.04)} ${n(-hw * 0.12)} ${n(-L * 1.02)} 0 ${n(-L * 0.95)}`,
    `C${n(hw * 0.12)} ${n(-L * 1.02)} ${n(hw * 0.46)} ${n(-L * 1.04)} ${n(hw * 0.72)} ${n(-L * 0.9)}`,
    `C${n(hw * 1.28)} ${n(-L * 0.6)} ${n(hw * 1.05)} ${n(-L * 0.12)} 0 0Z`,
  ].join(" ");
}

const LAYERS = [
  { count: 8, len: 1.0, wid: 0.8, grad: "o" },
  { count: 7, len: 0.8, wid: 0.68, grad: "m" },
  { count: 6, len: 0.6, wid: 0.56, grad: "i" },
  { count: 5, len: 0.4, wid: 0.44, grad: "c" },
];

type Petal = { layer: number; grad: string; rot: number; len: number; wid: number; d: string; delay: number };

// deep: 0 = all light, 1 = deeper core, 2 = deeper core and inner ring.
function buildPetals(seed: number, R: number, deep: number): Petal[] {
  const rand = seeded(seed);
  const petals: Petal[] = [];
  LAYERS.forEach((layer, li) => {
    const start = rand() * 360;
    for (let i = 0; i < layer.count; i++) {
      const len = R * layer.len * (0.92 + rand() * 0.16);
      const wid = R * layer.wid * (0.92 + rand() * 0.16);
      let grad = layer.grad;
      if (li === 1 && rand() < 0.07) grad = "dm";
      if (li === 2 && (deep >= 2 || rand() < 0.1)) grad = "di";
      if (li === 3 && deep >= 1) grad = "dc";
      petals.push({
        layer: li,
        grad,
        rot: n(start + (i * 360) / layer.count + (rand() - 0.5) * 14),
        len,
        wid,
        d: petalPath(len, wid),
        // When animating, the core opens first and the outer petals sweep open last.
        delay: Math.round((LAYERS.length - 1 - li) * 280 + i * 55 + rand() * 60),
      });
    }
  });
  return petals;
}

export function Flower({
  seed,
  size,
  defsId,
  detail = false,
  animate = false,
  deep = 0,
}: {
  seed: number;
  size: number;
  defsId: string;
  detail?: boolean;
  animate?: boolean;
  deep?: number;
}) {
  const petals = useMemo(() => buildPetals(seed, size, deep), [seed, size, deep]);
  const stamens = useMemo(() => {
    const rand = seeded(seed + 101);
    return Array.from({ length: 16 }, () => {
      const a = rand() * Math.PI * 2;
      const r = size * (0.03 + rand() * 0.09);
      return { x: n(Math.cos(a) * r), y: n(Math.sin(a) * r), r: n(size * (0.012 + rand() * 0.01)) };
    });
  }, [seed, size]);

  return (
    <g>
      {petals.map((p, i) => (
        <g key={i} transform={`rotate(${p.rot})`}>
          <g
            className={animate ? "flower-grow" : undefined}
            style={animate ? ({ "--delay": `${p.delay}ms` } as CSSProperties) : undefined}
          >
            <path d={p.d} fill={`url(#${defsId}-${p.grad})`} className="flower-petal" strokeWidth={Math.max(0.25, size * 0.006)} />
            {detail && p.layer < 2 && (
              <g className="flower-vein" strokeWidth={Math.max(0.25, size * 0.005)}>
                <path d={`M0 ${n(-p.len * 0.1)} L0 ${n(-p.len * 0.78)}`} />
                <path d={`M0 ${n(-p.len * 0.14)} Q${n(-p.wid * 0.2)} ${n(-p.len * 0.45)} ${n(-p.wid * 0.3)} ${n(-p.len * 0.78)}`} />
                <path d={`M0 ${n(-p.len * 0.14)} Q${n(p.wid * 0.2)} ${n(-p.len * 0.45)} ${n(p.wid * 0.3)} ${n(-p.len * 0.78)}`} />
              </g>
            )}
          </g>
        </g>
      ))}
      <g
        className={animate ? "flower-core" : undefined}
        style={animate ? ({ "--delay": `${LAYERS.length * 280 + 200}ms` } as CSSProperties) : undefined}
      >
        <circle r={n(size * 0.1)} fill="#3c4a58" />
        {stamens.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} className="flower-stamen" />
        ))}
        <circle r={n(size * 0.03)} className="flower-pistil" />
      </g>
    </g>
  );
}

export function Leaf({
  x,
  y,
  rot,
  len,
  defsId,
  detail = false,
  animate = false,
  delay = 0,
}: {
  x: number;
  y: number;
  rot: number;
  len: number;
  defsId: string;
  detail?: boolean;
  animate?: boolean;
  delay?: number;
}) {
  const w = len * 0.27;
  const d = `M0 0 C${n(len * 0.2)} ${n(-w * 1.15)} ${n(len * 0.68)} ${n(-w * 1.05)} ${n(len)} 0 C${n(len * 0.68)} ${n(w * 1.05)} ${n(len * 0.2)} ${n(w * 1.15)} 0 0Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g
        className={animate ? "flower-grow" : undefined}
        style={animate ? ({ "--delay": `${delay}ms` } as CSSProperties) : undefined}
      >
        <path d={d} fill={`url(#${defsId}-leaf)`} className="leaf-shape" strokeWidth={Math.max(0.25, len * 0.012)} />
        <path d={`M0 0 L${n(len * 0.94)} 0`} className="leaf-vein" strokeWidth={Math.max(0.3, len * 0.014)} />
        {detail &&
          [0.28, 0.5, 0.72].map((t) => (
            <g key={t} className="leaf-vein" strokeWidth={Math.max(0.25, len * 0.01)}>
              <path d={`M${n(len * t)} 0 L${n(len * (t + 0.14))} ${n(-w * 0.62)}`} />
              <path d={`M${n(len * t)} 0 L${n(len * (t + 0.14))} ${n(w * 0.62)}`} />
            </g>
          ))}
      </g>
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

export function Blossom({
  seed,
  size,
  defsId,
  animate = false,
  delay = 0,
}: {
  seed: number;
  size: number;
  defsId: string;
  animate?: boolean;
  delay?: number;
}) {
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
    <g
      className={animate ? "flower-grow" : undefined}
      style={animate ? ({ "--delay": `${delay}ms` } as CSSProperties) : undefined}
    >
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

const RING_LEAVES = 7;
// Leaves whose gap (the slot after them) gets a blossom; two gaps stay empty so it isn't a neat ring.
const BLOSSOM_GAPS = [0, 1, 2, 4, 5];

// Stand-alone bloom with a ring of leaves, for the RSVP card and the opening animation.
export function FlowerBloom({
  className = "",
  seed = 7,
  animate = false,
  deep = 2,
}: {
  className?: string;
  seed?: number;
  animate?: boolean;
  deep?: number;
}) {
  const id = useDefsId();
  // Uneven angles and lengths: evenly spaced identical leaves look like a star, not a plant.
  const leaves = useMemo(() => {
    const rand = seeded(seed + 7);
    return Array.from({ length: RING_LEAVES }, (_, i) => ({
      rot: n(i * (360 / RING_LEAVES) + 12 + (rand() - 0.5) * 18),
      len: n(80 + rand() * 18),
    }));
  }, [seed]);
  // Blossoms sit between the leaf tips, behind the main flower.
  const blossoms = useMemo(() => {
    const rand = seeded(seed + 31);
    return BLOSSOM_GAPS.map((gap, i) => {
      const a = (((gap + 0.5) * 360) / RING_LEAVES + 12 + (rand() - 0.5) * 10) * (Math.PI / 180);
      const r = 66 + rand() * 10;
      return { x: n(Math.cos(a) * r), y: n(Math.sin(a) * r), size: n(15 + rand() * 6), seed: seed + 40 + i };
    });
  }, [seed]);
  return (
    <svg className={`flower-bloom ${className}`} viewBox="-100 -100 200 200" aria-hidden="true">
      <FlowerDefs id={id} />
      {leaves.map((l, i) => (
        <Leaf key={i} x={0} y={0} rot={l.rot} len={l.len} defsId={id} detail animate={animate} delay={i * 70} />
      ))}
      {blossoms.map((b, i) => (
        <g key={b.seed} transform={`translate(${b.x} ${b.y})`}>
          <Blossom seed={b.seed} size={b.size} defsId={id} animate={animate} delay={500 + i * 140} />
        </g>
      ))}
      <Flower seed={seed} size={64} defsId={id} detail animate={animate} deep={deep} />
    </svg>
  );
}
