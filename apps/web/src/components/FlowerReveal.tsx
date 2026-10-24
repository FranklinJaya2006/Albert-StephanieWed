import type { CSSProperties } from "react";
import { invitation } from "../data/invitation";
import { FlowerBloom } from "./Flower";

const SPARKLE_COUNT = 8;

// Full-screen opening: the cream backdrop fades in over the cover (onCovered fires once it is
// fully opaque), the same navy bloom as the rest of the invitation opens, then it all fades out
// (onComplete).
export default function FlowerReveal({ onCovered, onComplete }: { onCovered: () => void; onComplete: () => void }) {
  return (
    <div
      className="flower-reveal"
      role="status"
      aria-label="Membuka undangan"
      onAnimationEnd={(event) => {
        // Animations of children and of the frame pseudo-elements bubble up here too.
        if (event.animationName === "reveal-bg-in" && (event.target as HTMLElement).classList.contains("flower-reveal-bg")) {
          onCovered();
        } else if (event.target === event.currentTarget && event.animationName === "flower-reveal-exit") {
          onComplete();
        }
      }}
    >
      <div className="flower-reveal-bg" aria-hidden="true" />
      <div className="flower-reveal-glow" aria-hidden="true" />
      <svg className="flower-reveal-orbit" viewBox="0 0 200 200" aria-hidden="true">
        <circle className="orbit-line" cx="100" cy="100" r="99" pathLength="1" />
        <circle className="orbit-line orbit-line-inner" cx="100" cy="100" r="93" pathLength="1" />
      </svg>
      <div className="flower-reveal-sparkles" aria-hidden="true">
        {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
          <span key={i} style={{ "--angle": `${i * (360 / SPARKLE_COUNT) + 22}deg`, "--delay": `${2.4 + i * 0.22}s` } as CSSProperties} />
        ))}
      </div>
      <FlowerBloom animate seed={7} />
      <div className="flower-reveal-caption">
        <span>A love in bloom</span>
        <p>
          {invitation.coverNames.groom} &amp; {invitation.coverNames.bride}
        </p>
      </div>
    </div>
  );
}
