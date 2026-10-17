// Swan divider echoes the favicon, with one swan bowing slightly lower.
function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg className={`ornament ${className}`} viewBox="0 0 240 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 25H87 M153 25H218" strokeWidth="0.8" opacity="0.45" />
        <g strokeWidth="1.8">
          <path d="M119 12C115 2 106 5 106 13c0 9 12 14 14 20" />
          <path d="M121 16c4-8 12-7 12 0 0 7-11 12-13 17" />
          <path d="M116 27c-7-7-12 2-19-3 2 9 12 12 23 9" />
          <path d="M124 28c7-6 11 2 18-2-2 8-12 10-22 7" />
          <path d="m117 11 3 5 M123 15l-3 3" strokeWidth="1.3" />
        </g>
        <path d="M102 29c4 2 7 2 10 1 M137 30c-3 2-6 2-9 1 M108 39h24" strokeWidth="0.8" opacity="0.65" />
      </g>
      <g fill="currentColor">
        <circle cx="115" cy="9" r="0.8" />
        <circle cx="125" cy="13" r="0.8" />
      </g>
    </svg>
  );
}
export default Ornament;
