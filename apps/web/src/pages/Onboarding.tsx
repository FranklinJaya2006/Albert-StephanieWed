import Photo from "../components/Photo";
import { invitation } from "../data/invitation";

function Onboarding({ onOpen, opened }: { onOpen: () => void; opened: boolean }) {
  const { coverNames, photos, eventDateTime } = invitation;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(new Date(eventDateTime)).replaceAll("/", " • ");

  return (
    <section className="cover">
      <Photo src={photos.cover} label="Cover photo" className="cover-photo" />
      <div className="cover-content">
        <h1 className="cover-names">
          {coverNames.groom}
          <span className="amp">&amp;</span>
          {coverNames.bride}
        </h1>
        <p className="cover-date">{dateLabel}</p>
        {/* Gone once pressed: the opening plays only once, so it must not look pressable again. */}
        {!opened && (
          <button className="cover-next" type="button" aria-label="Buka undangan" onClick={onOpen}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16M5 13l7 7 7-7" /></svg>
          </button>
        )}
      </div>
    </section>
  );
}

export default Onboarding;
