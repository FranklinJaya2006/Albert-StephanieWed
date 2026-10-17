// Symmetric scrollwork flourish used as a section accent. Richer than a straight rule —
// curls on both sides meeting a central fleuron.
function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ornament ${className}`}
      viewBox="0 0 240 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M120 7 C104 7 96 16 80 16 L18 16" />
        <path d="M120 25 C104 25 96 16 80 16" />
        <path d="M120 7 C136 7 144 16 160 16 L222 16" />
        <path d="M120 25 C136 25 144 16 160 16" />
        <path d="M18 16 C26 16 28 9 21 8 C16 7.4 14.5 11.5 18 13.5" />
        <path d="M222 16 C214 16 212 9 219 8 C224 7.4 225.5 11.5 222 13.5" />
      </g>
      <path d="M120 1 L128 16 L120 31 L112 16 Z" fill="currentColor" />
      <circle cx="80" cy="16" r="2.4" fill="currentColor" />
      <circle cx="160" cy="16" r="2.4" fill="currentColor" />
    </svg>
  );
}

export default Ornament;
