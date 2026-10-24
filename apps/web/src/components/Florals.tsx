import { useDefsId } from "../lib/useDefsId";
import { Blossom, Bud, Flower, FlowerDefs, Leaf } from "./Flower";

// Corner garland: a leafy branch with blooms and buds hanging from the top-left corner,
// mirrored into the other corners via CSS. Keep everything inside the 180×110 viewBox — the
// section reserves exactly that much room (see --florals-space in index.css).
const STEMS = [
  { d: "M-8 10 C30 12 72 26 108 58", w: 2.4 },
  { d: "M42 17 C68 5 108 4 140 24", w: 1.8 },
  { d: "M66 28 C68 52 76 78 88 94", w: 1.6 },
  { d: "M108 58 C126 56 142 56 158 58", w: 1.3 },
  { d: "M86 40 C98 32 108 22 114 12", w: 1.2 },
];

const LEAVES = [
  { x: 12, y: 11, rot: 38, len: 24 },
  { x: 24, y: 12, rot: -34, len: 22 },
  { x: 42, y: 17, rot: 66, len: 21 },
  { x: 54, y: 21, rot: -14, len: 20 },
  { x: 72, y: 31, rot: 84, len: 21 },
  { x: 80, y: 38, rot: 8, len: 17 },
  { x: 60, y: 11, rot: -32, len: 19 },
  { x: 80, y: 7, rot: 40, len: 17 },
  { x: 100, y: 6, rot: -26, len: 18 },
  { x: 120, y: 12, rot: 38, len: 16 },
  { x: 67, y: 40, rot: 162, len: 17 },
  { x: 72, y: 58, rot: 26, len: 16 },
  { x: 78, y: 74, rot: 154, len: 16 },
  { x: 83, y: 86, rot: 32, len: 14 },
  { x: 122, y: 57, rot: -34, len: 15 },
  { x: 138, y: 57, rot: 44, len: 14 },
  { x: 97, y: 33, rot: -62, len: 13 },
];

// deep: how much deeper slate shows in the middle (see Flower.tsx). Mixed on purpose.
const FLOWERS = [
  { x: 108, y: 58, size: 21, seed: 3, deep: 1 },
  { x: 140, y: 25, size: 16, seed: 8, deep: 0 },
  { x: 88, y: 94, size: 12, seed: 15, deep: 2 },
  { x: 160, y: 59, size: 8, seed: 21, deep: 0 },
];

// The second flower type, in blush pink, tucked in beside the stems.
const BLOSSOMS = [
  { x: 70, y: 56, size: 13, seed: 4 },
  { x: 126, y: 16, size: 10, seed: 9 },
  { x: 47, y: 15, size: 9, seed: 13 },
];

function Florals({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const id = useDefsId();
  return (
    <svg className={`florals florals-${position}`} viewBox="0 0 180 110" aria-hidden="true">
      <FlowerDefs id={id} />
      <g className="florals-stem">
        {STEMS.map((s) => (
          <path key={s.d} d={s.d} strokeWidth={s.w} />
        ))}
      </g>
      {LEAVES.map((l, i) => (
        <Leaf key={i} {...l} defsId={id} />
      ))}
      <Bud x={114} y={13} rot={24} size={8} defsId={id} />
      {BLOSSOMS.map((b) => (
        <g key={b.seed} transform={`translate(${b.x} ${b.y})`}>
          <Blossom seed={b.seed} size={b.size} defsId={id} />
        </g>
      ))}
      {FLOWERS.map((f) => (
        <g key={f.seed} transform={`translate(${f.x} ${f.y})`}>
          <Flower seed={f.seed} size={f.size} defsId={id} deep={f.deep} />
        </g>
      ))}
    </svg>
  );
}

export default Florals;
