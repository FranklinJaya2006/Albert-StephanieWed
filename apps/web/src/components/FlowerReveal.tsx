import type { CSSProperties } from "react";
import { invitation } from "../data/invitation";
import { FlowerBloom } from "./Flower";

const SPARKLE_COUNT = 8;

// Full-screen opening: the cream backdrop fades in over the cover (onCovered fires once it is
// fully opaque), the same slate-blue bloom as the rest of the invitation opens inside a circle with the
// caption centred underneath it, then it all fades out (onComplete).
// It is built ahead of time, invisible and with every animation paused; `active` just lets them go,
// so pressing the button starts the opening at once instead of after the page builds it.
export default function FlowerReveal({ active, onCovered, onComplete }: { active: boolean; onCovered: () => void; onComplete: () => void }) {
  return (
    <div
      className="flower-reveal"
      data-active={active ? "" : undefined}
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
      <div className="flower-reveal-stage">
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
        <FlowerBloom animate />
      </div>
      <div className="flower-reveal-caption">
        <span>A love in bloom</span>
        <p>
          {invitation.coverNames.groom} &amp; {invitation.coverNames.bride}
        </p>
      </div>
    </div>
  );
}
