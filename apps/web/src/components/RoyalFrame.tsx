// Rectangular frame with baroque corner flourishes, a mounted crest at the top edge, and
// small diamonds at the remaining midpoints. The double border is drawn in CSS; each corner
// is one SVG flourish, mirrored into the other three via CSS transforms.
function Corner({ position }: { position: string }) {
  return (
    <svg
      className={`royal-corner royal-corner-${position}`}
      viewBox="0 0 90 90"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M10 80 C10 44 44 10 80 10" />
        <path d="M24 76 C24 48 48 24 76 24" opacity="0.55" />
        <path d="M80 10 C64 13 52 25 52 40 C52 49 60 53 65 47 C69 42 64 35 57 38" />
        <path d="M10 80 C13 64 25 52 40 52 C49 52 53 60 47 65 C42 69 35 64 38 57" />
      </g>
      <path d="M6 6 L13 13 L6 20 L-1 13 Z" fill="currentColor" transform="translate(1 1)" />
    </svg>
  );
}

// A crest mounted on the top border: symmetric scrolls rising to a central jewel.
function Crest() {
  return (
    <svg
      className="royal-crest"
      viewBox="0 0 140 46"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M70 12 C58 22 46 22 34 15" />
        <path d="M70 12 C82 22 94 22 106 15" />
        <path d="M34 15 C26 12 23 18 29 20 C34 21.5 37 17 34 15.5" />
        <path d="M106 15 C114 12 117 18 111 20 C106 21.5 103 17 106 15.5" />
        <path d="M70 10 L70 2" />
      </g>
      <path d="M70 4 L77 13 L70 22 L63 13 Z" fill="currentColor" />
      <circle cx="34" cy="15" r="2.1" fill="currentColor" />
      <circle cx="106" cy="15" r="2.1" fill="currentColor" />
      <circle cx="70" cy="34" r="2.4" fill="currentColor" />
    </svg>
  );
}

function RoyalFrame() {
  return (
    <div className="royal-frame" aria-hidden="true">
      <Crest />
      <Corner position="tl" />
      <Corner position="tr" />
      <Corner position="bl" />
      <Corner position="br" />
      <span className="royal-mid royal-mid-b" />
      <span className="royal-mid royal-mid-l" />
      <span className="royal-mid royal-mid-r" />
    </div>
  );
}

export default RoyalFrame;
