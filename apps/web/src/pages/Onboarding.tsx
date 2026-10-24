import Photo from "../components/Photo";
import { invitation } from "../data/invitation";

function Onboarding({ onOpen, opening }: { onOpen: () => void; opening: boolean }) {
  const { coverNames, photos, eventDateTime } = invitation;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(new Date(eventDateTime)).replaceAll("/", " • ");

  return (
    <section className={`cover${opening ? " cover-opening" : ""}`}>
      <Photo src={photos.cover} label="Cover photo" className="cover-photo" />
      <div className="cover-content">
        <h1 className="cover-names">
          {coverNames.groom}
          <span className="amp">&amp;</span>
          {coverNames.bride}
        </h1>
        <p className="cover-date">{dateLabel}</p>
        <button className="cover-next" type="button" disabled={opening} aria-busy={opening} aria-label={opening ? "Membuka undangan" : "Buka undangan"} onClick={onOpen}>
          {opening ? <span className="cover-spinner" aria-hidden="true" /> : <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16M5 13l7 7 7-7" /></svg>}
        </button>
      </div>
    </section>
  );
}

export default Onboarding;
