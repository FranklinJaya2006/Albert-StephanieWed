import { Link, useSearchParams } from "react-router-dom";
import Photo from "../components/Photo";
import { invitation } from "../data/invitation";

function Onboarding() {
  const [searchParams] = useSearchParams();
  const guestName = searchParams.get("to");
  const nextHref = guestName ? `/rsvp?to=${encodeURIComponent(guestName)}` : "/rsvp";
  const { coverNames, photos, eventDateTime } = invitation;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(new Date(eventDateTime)).replaceAll("/", " • ");

  return (
    <main className="cover">
      <Photo src={photos.cover} label="Cover photo" className="cover-photo" />
      <div className="cover-content">
        <h1 className="cover-names">
          {coverNames.groom}
          <span className="amp">&amp;</span>
          {coverNames.bride}
        </h1>
        <p className="cover-date">{dateLabel}</p>
        <Link className="cover-next" to={nextHref} state={{ curtainReveal: true }} aria-label="Let's Begin — buka undangan">
          <span>Let&apos;s Begin</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v16M5 13l7 7 7-7" />
          </svg>
        </Link>
      </div>
    </main>
  );
}

export default Onboarding;
