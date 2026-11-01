import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { invitation } from "../data/invitation";
import type { Reservation } from "../lib/weddingApi";
import { DEMO_MODE } from "../lib/weddingApi";
import { downloadAccessCard } from "./downloadAccessCard";

export default function ReservationQr({ reservation }: { reservation: Reservation }) {
  const [current, setCurrent] = useState(() => reservation.event === "both" && new URLSearchParams(window.location.search).get("event") === "reception" ? 1 : 0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const events = reservation.event === "both" ? ["ceremony", "reception"] as const
    : [reservation.event === "ceremony" ? "ceremony" : "reception"] as const;
  const eventKey = events[Math.min(current, events.length - 1)];
  const event = invitation[eventKey];
  const images = useMemo(() => {
    function create(event: "ceremony" | "reception") {
      const qr = qrcode(0, "M");
      qr.addData(`ASW:${DEMO_MODE ? "demo" : "v1"}:${reservation.token}:${event}`);
      qr.make();
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag(5, 20))}`;
    }
    return { ceremony: create("ceremony"), reception: create("reception") };
  }, [reservation.token]);
  const image = images[eventKey];
  if (reservation.attending !== "yes") return null;
  return (
    <div className="ticket-carousel" role="region" aria-roledescription={events.length > 1 ? "carousel" : undefined} aria-label="Your event access cards">
      <div className="ticket-carousel-stage">
      {events.map((cardKey) => {
        const event = invitation[cardKey];
        const active = cardKey === eventKey;
        return <article key={cardKey} className="reservation-ticket event-ticket" data-active={active} aria-hidden={!active} inert={!active} id={active ? "reservation-access-card" : undefined} aria-label={`${event.label} access card`}>
        <header className="ticket-photo-header">
          <img className="ticket-photo" src={invitation.photos.accessCard} alt="Albert and Stephanie" />
          <div className="ticket-photo-caption">
            <span className="ticket-kicker">Entrance access card</span>
            <h3>{invitation.coverNames.groom} &amp; {invitation.coverNames.bride}</h3>
            <p>{event.label}</p>
          </div>
        </header>
        <div className="ticket-event-details">
          <h4>{event.venue}</h4>
          <p>{event.address}</p>
          <p>{event.date} · {event.time}</p>
        </div>
        <div className="ticket-guest-row">
          <img className="ticket-qr" src={images[cardKey]} width="220" height="220" alt={`${event.label} entrance QR for ${reservation.name}`} />
          <div className="ticket-guest-details">
            <span>Reserved for</span>
            <h4>{reservation.name}</h4>
            <span>Admission</span>
            <p>{reservation.guests} {reservation.guests === 1 ? "guest" : "guests"}</p>
            <span className="ticket-event-badge">{event.label}</span>
          </div>
        </div>
        <p className="ticket-instruction">Please have this card ready when arriving at the venue.</p>
        <p className="ticket-reference">Reservation · {reservation.id}</p>
        {DEMO_MODE && <p className="card-note">Preview card · not valid for event admission.</p>}
      </article>;
      })}
      </div>
      {events.length > 1 && <div className="carousel-controls ticket-controls">
        <button type="button" aria-label="Previous event card" onClick={() => setCurrent((current + 1) % events.length)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
        <span role="status" aria-live="polite">{current + 1} / {events.length} · {event.label}</span>
        <button type="button" aria-label="Next event card" onClick={() => setCurrent((current + 1) % events.length)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
      </div>}
      <p className="access-download-instruction">Please download the <strong>Entrance Access Card</strong> above, to simplify the scanning process at the event location:</p>
      <div className="access-card-actions">
        <button type="button" className="button" disabled={downloading} onClick={async () => {
          setDownloading(true); setDownloadError("");
          try { await downloadAccessCard(reservation, eventKey, image); }
          catch { setDownloadError("We could not download your card. Please try again, or open it on the website."); }
          finally { setDownloading(false); }
        }}>{downloading ? "Preparing your card…" : "Download Access Card"}</button>
      </div>
      {downloadError && <p role="alert">{downloadError}</p>}
    </div>
  );
}

