import type { CSSProperties } from "react";
import { invitation } from "../data/invitation";

export function Bloom({ className = "" }: { className?: string }) {
  return (
    <svg className={`bloom ${className}`} viewBox="-170 -170 340 340" fill="none" aria-hidden="true">
      {[0, 1].map((layer) => (
        <g key={layer} transform={`rotate(${layer * 30}) scale(${layer === 0 ? 1 : 0.7})`}>
          {Array.from({ length: 6 }, (_, index) => (
            <g key={index} transform={`rotate(${index * 60})`}>
              <ellipse className={`bloom-petal bloom-petal-${layer}`} cx="0" cy="-64" rx="39" ry="72"
                style={{ "--petal-delay": `${index * 65 + layer * 140}ms` } as CSSProperties} />
            </g>
          ))}
        </g>
      ))}
      <circle r="13" fill="currentColor" opacity="0.75" />
      <circle r="20" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

const SPARKLE_COUNT = 8;

export default function FlowerReveal({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flower-reveal" role="status" aria-label="Membuka undangan"
      onAnimationEnd={(event) => {
        // Pseudo-element animations (the frame) also report this element as target.
        if (event.target === event.currentTarget && event.animationName === "flower-reveal-exit") onComplete();
      }}>
      <div className="flower-reveal-glow" aria-hidden="true" />
      <svg className="flower-reveal-orbit" viewBox="0 0 200 200" aria-hidden="true">
        <circle className="orbit-line" cx="100" cy="100" r="99" pathLength="1" />
        <circle className="orbit-line orbit-line-inner" cx="100" cy="100" r="93" pathLength="1" />
      </svg>
      <div className="flower-reveal-sparkles" aria-hidden="true">
        {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
          <span key={i} style={{ "--angle": `${i * (360 / SPARKLE_COUNT) + 22}deg`, "--delay": `${2.2 + i * 0.22}s` } as CSSProperties} />
        ))}
      </div>
      <Bloom />
      <div className="flower-reveal-caption">
        <span>A love in bloom</span>
        <p>{invitation.coverNames.groom} &amp; {invitation.coverNames.bride}</p>
      </div>
    </div>
  );
}
