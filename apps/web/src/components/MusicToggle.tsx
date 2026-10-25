// Small round button that mutes/unmutes the background song. Shown only once the invitation is open.
function MusicToggle({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button className="music-toggle" type="button" onClick={onToggle} aria-label={playing ? "Matikan musik" : "Nyalakan musik"} aria-pressed={playing}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V6l10-2v12" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="16.5" cy="16" r="2.5" />
        {!playing && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

export default MusicToggle;
