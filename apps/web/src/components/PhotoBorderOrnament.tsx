// Ornament that sits on the bottom edge of a framed photo: a centre diamond with a scroll curling
// out on each side and a fading rule. One half is drawn and mirrored.
function Half() {
  return (
    <>
      <path d="M90 14C98 14 100 6 108 6C114 6 116 12 111 13C107 14 106 9 110 9" />
      <path d="M90 14C98 14 100 22 108 22C114 22 116 16 111 15C107 14 106 19 110 19" />
      <path d="M119 14H150" strokeWidth="0.8" opacity="0.55" />
      <circle cx="154" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="95" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </>
  );
}

function PhotoBorderOrnament({ className = "" }: { className?: string }) {
  return (
    <svg className={`photo-ornament ${className}`} viewBox="0 0 160 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <Half />
        <g transform="matrix(-1 0 0 1 160 0)">
          <Half />
        </g>
        <path d="M80 7L87 14L80 21L73 14Z" fill="currentColor" />
        <path d="M80 11L83 14L80 17L77 14Z" fill="var(--ivory)" stroke="none" />
      </g>
    </svg>
  );
}

export default PhotoBorderOrnament;
