// Monogram: a tall first initial overlapped by the second, with a small leaf sprig under the
// first initial's left leg.
const LEAF_YS = [146, 154, 162, 170];

function Monogram({ first, second, className = "" }: { first: string; second: string; className?: string }) {
  return (
    <svg
      className={`monogram ${className}`}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${first} & ${second}`}
    >
      {/* Horizontal squeeze gives the tall, slender letterforms of an engraved seal. */}
      <text transform="translate(90 130) scale(0.78 1)" textAnchor="middle" className="monogram-letter monogram-first">
        {first}
      </text>
      <text transform="translate(122 166) scale(0.86 1)" textAnchor="middle" className="monogram-letter monogram-second">
        {second}
      </text>
      <g className="seal-sprig">
        <path d="M58 136 V184" />
        {LEAF_YS.map((y) => (
          <g key={y}>
            <path d={`M58 ${y} C54 ${y - 1} 51 ${y - 4} 50 ${y - 7} C54 ${y - 6} 57 ${y - 4} 58 ${y}`} />
            <path d={`M58 ${y} C62 ${y - 1} 65 ${y - 4} 66 ${y - 7} C62 ${y - 6} 59 ${y - 4} 58 ${y}`} />
          </g>
        ))}
        <circle cx="58" cy="134" r="1.6" />
      </g>
    </svg>
  );
}

export default Monogram;
