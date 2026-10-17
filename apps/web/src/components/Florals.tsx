// Decorative floral branch for section corners. Drawn for the top-left corner and mirrored
// into the others via CSS.
const BLOSSOMS = [
  { x: 125, y: 20, r: 11 },
  { x: 95, y: 105, r: 13 },
  { x: 148, y: 76, r: 9 },
  { x: 112, y: 168, r: 7 },
];

const LEAVES = [
  { x: 22, y: 22, a: 25 },
  { x: 52, y: 44, a: -35 },
  { x: 52, y: 44, a: 125 },
  { x: 72, y: 22, a: -15 },
  { x: 86, y: 80, a: 165 },
  { x: 112, y: 68, a: -25 },
  { x: 104, y: 132, a: 65 },
];

const PETAL_ANGLES = [0, 72, 144, 216, 288];

function Florals({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg className={`florals florals-${position}`} viewBox="0 0 180 180" aria-hidden="true">
      <g className="florals-stem">
        <path d="M-5 20 C35 25 70 55 95 105 C105 125 110 145 112 168" />
        <path d="M40 32 C65 18 95 14 125 20" />
        <path d="M78 75 C100 66 125 66 148 76" />
      </g>
      {LEAVES.map((l, i) => (
        <path
          key={i}
          className="florals-leaf"
          d="M0 0 C6 -7 18 -7 26 0 C18 7 6 7 0 0 Z"
          transform={`translate(${l.x} ${l.y}) rotate(${l.a})`}
        />
      ))}
      {BLOSSOMS.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y})`}>
          {PETAL_ANGLES.map((a) => (
            <ellipse
              key={a}
              className="florals-petal"
              cx="0"
              cy={-b.r * 0.75}
              rx={b.r * 0.5}
              ry={b.r * 0.8}
              transform={`rotate(${a})`}
            />
          ))}
          <circle className="florals-center" r={b.r * 0.28} />
        </g>
      ))}
    </svg>
  );
}

export default Florals;
