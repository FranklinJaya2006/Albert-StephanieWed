import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Countdown from "../components/Countdown";
import EventCard from "../components/EventCard";
import Florals from "../components/Florals";
import Monogram from "../components/Monogram";
import Ornament from "../components/Ornament";
import FramedPhoto from "../components/FramedPhoto";
import PhotoCarousel from "../components/PhotoCarousel";
import ReservationQr from "../components/ReservationQr";
import { weddingApi, savedReservationToken, inviteTokenFromPath, newRequestKey, DEMO_MODE, RESERVATION_STORAGE_KEY, type Reservation, type Wish } from "../lib/weddingApi";
import { invitation } from "../data/invitation";

type Person = (typeof invitation)["groom"];

function PersonCard({ person, photo, photoClassName = "" }: { person: Person; photo: string; photoClassName?: string }) {
  return (
    <div className="person">
      <FramedPhoto src={photo} label={person.name} className={`person-frame ${photoClassName}`} />
      <h3 className="person-name">{person.name}</h3>
      <p className="person-parents">
        {person.parentsLabel}
        <br />
        {person.father}
        <br />
        and {person.mother}
      </p>
      <p className="person-social">
        <a href={`https://www.instagram.com/${person.instagram.replace(/^@/, "")}/`} target="_blank" rel="noopener noreferrer">
          {person.instagram}
        </a>
      </p>
    </div>
  );
}

function Rsvp({ shown = true, ready = true }: { shown?: boolean; ready?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const guestName = searchParams.get("to");
  const inviteToken = DEMO_MODE ? null : (inviteTokenFromPath() ?? searchParams.get("invite"));
  const [invitationInfo, setInvitationInfo] = useState<{ name: string; maxGuests: number } | null>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [allowUninvited, setAllowUninvited] = useState(false);
  const [attending, setAttending] = useState(""); // nothing is chosen until the guest presses one of the two buttons
  const [wished, setWished] = useState(false);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const reserved = Boolean(activeReservation);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [reservationError, setReservationError] = useState("");
  const [wishError, setWishError] = useState("");
  const [savingReservation, setSavingReservation] = useState(false);
  const [savingWish, setSavingWish] = useState(false);
  const [token, setToken] = useState(savedReservationToken);
  const [loadingCard, setLoadingCard] = useState(Boolean(token));
  const reservationRequestKey = useRef<string | null>(null);
  const wishRequestKey = useRef<string | null>(null);
  const { groom, bride, coverNames, initials, photos } = invitation;
  const guestCount = invitationInfo?.maxGuests ?? 1; // set by the organiser (sheet pax), never asked

  useEffect(() => {
    if (!shown) return;
    let live = true;
    weddingApi<Wish[]>("/wishes").then((entries) => { if (live) setWishes(entries); }).catch((error: Error) => { if (live) setWishError(error.message); });
    weddingApi<{ allowUninvited: boolean }>("/reservation-options").then((options) => { if (live) setAllowUninvited(options.allowUninvited); }).catch((error: Error) => { if (live) setReservationError(error.message); }).finally(() => { if (live && !inviteToken) setCheckingInvitation(false); });
    if (inviteToken) {
      weddingApi<{ name: string; maxGuests: number; reservation: Reservation | null }>(`/invitations/${encodeURIComponent(inviteToken)}`).then((info) => {
        if (!live) return;
        setInvitationInfo(info);
        if (info.reservation) setActiveReservation(info.reservation);
      }).catch((error: Error) => { if (live) setReservationError(error.message); }).finally(() => { if (live) setCheckingInvitation(false); });
    }
    if (token) weddingApi<Reservation>(`/reservations/${encodeURIComponent(token)}`).then((entry) => { if (live) setActiveReservation(entry); }).catch((error: Error) => { if (live) setReservationError(error.message); }).finally(() => { if (live) setLoadingCard(false); });
    return () => { live = false; };
  }, [shown, token, inviteToken]);

  // Fade-up text blocks as they scroll into view. Uses a data attribute (not className) so
  // React re-renders never clobber the state. The blocks are marked hidden as soon as the page
  // is laid out (still covered by the opening overlay) and only start being revealed once the
  // overlay has gone, so the first screen fades up in view and nothing flickers.
  useEffect(() => {
    if (!shown) return;
    const items = document.querySelectorAll<HTMLElement>(".invitation :is(h1, h2, h3, p, blockquote, .person, .couple-name-part, .event-card, .love-story-photo, .couple-row-photo)");
    items.forEach((el) => {
      if (el.matches(".couple-names")) return;
      if (el.closest(".person") && !el.matches(".person")) return;
      if (el.closest(".event-card") && !el.matches(".event-card")) return;
      if (el.closest(".reservation-card")) return;
      if (el.closest(".guest-results")) return;
      if (!el.dataset.reveal) el.dataset.reveal = "hidden";
    });
  }, [shown]);

  useEffect(() => {
    if (!shown || !ready) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "shown";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll<HTMLElement>('.invitation [data-reveal="hidden"]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [shown, ready]);



  return (
    <div className="invitation" id="invitation-content" inert={!ready} hidden={!shown}>
      <section className="section welcome">
        <Florals position="tl" />
        <Florals position="tr" />
        <p className="dear">Dear</p>
        <h2 className="guest-name">{invitationInfo?.name ?? guestName ?? "Our Honored Guest"}</h2>
        <Ornament />
        <p className="lead">
          By the grace of God and the blessings of our families, we cordially request the honour of
          your presence at the wedding of
        </p>
        <h1 className="couple-names">
          <span className="couple-name-part">{coverNames.groom}</span>
          <span className="amp couple-name-part">&amp;</span>
          <span className="couple-name-part">{coverNames.bride}</span>
        </h1>
        <blockquote className="quote">
          &ldquo;{invitation.quote.text}&rdquo;
          <cite>{invitation.quote.source}</cite>
        </blockquote>
      </section>

      <section className="section couple">
        <Florals position="bl" />
        <Florals position="br" />
        <PersonCard person={groom} photo={photos.groom} />
        <Ornament />
        <PersonCard person={bride} photo={photos.bride} photoClassName="bride-frame" />
      </section>

      <section className="section countdown-section" aria-labelledby="countdown-title">
        <h2 className="section-title" id="countdown-title">Counting the Days</h2>
        <Ornament />
        <Countdown target={invitation.eventDateTime} />
        <p className="eyebrow save-the-date">Save the Date</p>
      </section>

      <section className="section section-dark" aria-labelledby="events-title">
        <h2 className="section-title" id="events-title">When &amp; Where</h2>
        <Ornament />
        <div className="events">
          <EventCard {...invitation.ceremony} />
          <EventCard {...invitation.reception} />
        </div>
      </section>

      <section className="section reservation">
        <Florals position="tr" />
        <h2 className="section-title">Reservation</h2>
        <p className="lead">
          We'd love to hear from you!
          <br />
          Please fill out the confirmation below:
        </p>
        <div className="reservation-card">
        <div className="reservation-details">
        {loadingCard || checkingInvitation ? <p role="status">Loading your invitation…</p> : reserved ? (
          <div>
            <p className="thank-you" role="status">Thank you for confirming your attendance!</p>
            {activeReservation && <ReservationQr key={activeReservation.id} reservation={activeReservation} />}
          </div>
        ) : !invitationInfo && !allowUninvited ? (
          <p className="reservation-link-notice">Please open the personal invitation link sent by the organizer to confirm your attendance. Each invitation can be submitted only once.</p>
        ) : (
          <form
            className="wish-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get("name") ?? "").trim();
              if (!name || !attending) return;
              if (savingReservation) return;
              setSavingReservation(true); setReservationError("");
              try {
                reservationRequestKey.current ??= newRequestKey();
                const entry = await weddingApi<Reservation>("/reservations", { method: "POST", body: JSON.stringify({
                  requestKey: reservationRequestKey.current, name, attending, invitationToken: inviteToken ?? undefined,
                  event: attending === "yes" ? "reception" : "",
                  guests: attending === "yes" ? guestCount : 0, // the server uses the invitation's pax anyway
                }) });
                setActiveReservation(entry);
                try { localStorage.setItem(RESERVATION_STORAGE_KEY, entry.token); } catch { /* The card link also retains access. */ }
                const url = new URL(window.location.href); url.searchParams.set("reservation", entry.token);
                window.history.replaceState(null, "", url);
              } catch (error) { setReservationError((error as Error).message); }
              finally { setSavingReservation(false); }
            }}
          >
            <label>
              Your Name
              <input name="name" defaultValue={invitationInfo?.name ?? guestName ?? ""} readOnly={Boolean(invitationInfo)} maxLength={120} required />
            </label>
            <label>
              Guests
              <input name="guests" value={`${guestCount} ${guestCount === 1 ? "guest" : "guests"}`} readOnly />
            </label>
            <fieldset className="attendance-choice">
              <legend>Attendance</legend>
              <div className="attendance-options">
                <button type="button" aria-pressed={attending === "yes"} onClick={() => setAttending("yes")}>Will attend</button>
                <button type="button" aria-pressed={attending === "no"} onClick={() => setAttending("no")}>Unable to attend</button>
              </div>
            </fieldset>
            <button type="submit" className="button" disabled={savingReservation || !attending}>
              {savingReservation ? "Saving…" : "Confirm"}
            </button>
          </form>
        )}
        </div>
        </div>
        {reservationError && <p role="alert">{reservationError}</p>}
        {reserved && allowUninvited && <button type="button" className="text-button" onClick={() => {
          try { localStorage.removeItem(RESERVATION_STORAGE_KEY); } catch { /* Test again without local storage. */ }
          const next = new URLSearchParams(searchParams);
          next.delete("reservation"); next.delete("invite"); next.delete("event");
          setSearchParams(next, { replace: true });
          setActiveReservation(null); setToken(null); setInvitationInfo(null);
          setLoadingCard(false); setReservationError(""); reservationRequestKey.current = null;
        }}>Try another reservation</button>}
      </section>

      <section className="section portrait">
        <Florals position="tl" />
        <p className="eyebrow">Portrait of Us</p>
        <h2 className="section-title portrait-names">
          {coverNames.groom} &amp; {coverNames.bride}
        </h2>
        <Ornament />
        <PhotoCarousel photos={photos.portraits} />
        <p className="hashtag">{invitation.hashtag}</p>
      </section>

      <section className="section kind-words">
        <Florals position="bl" />
        <h2 className="section-title">Kind Words</h2>

        <p className="lead">Please leave your sincere prayer and wishes to us and our families:</p>
        {wished ? (
          <p className="thank-you">Thank you for your kind words and prayers!</p>
        ) : (
          <form
            className="wish-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get("name") ?? "").trim();
              const message = String(data.get("message") ?? "").trim();
              if (!name || !message) return;
              if (savingWish) return;
              setSavingWish(true); setWishError("");
              try {
                wishRequestKey.current ??= newRequestKey();
                const entry = await weddingApi<Wish>("/wishes", { method: "POST", body: JSON.stringify({ name, message, requestKey: wishRequestKey.current }) });
                setWishes((current) => [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 100));
                setWished(true); wishRequestKey.current = null;
              } catch (error) { setWishError((error as Error).message); }
              finally { setSavingWish(false); }
            }}
          >
            <label>
              Your Name
              <input name="name" defaultValue={guestName ?? ""} maxLength={120} required />
            </label>
            <label>
              Prayer &amp; Wishes
              <textarea name="message" rows={4} maxLength={2000} required />
            </label>
            <button type="submit" className="button" disabled={savingWish}>
              {savingWish ? "Sending…" : "Send Wishes"}
            </button>
          </form>
        )}
        {wished && <button type="button" className="text-button" onClick={() => setWished(false)}>Write another wish</button>}
        {wishError && <p role="alert">{wishError}</p>}
        <div className="guest-results" aria-label="Guest wishes" aria-live="polite">
          {wishes.map((entry) => <article className="guest-entry wish-entry" key={entry.id}><h3>{entry.name}</h3><p>{entry.message}</p></article>)}
        </div>
      </section>

      <section className="closing">
        <div className="closing-content">
          <p className="closing-note">
            It will be a joy for us if you are able to attend our wedding day. Thank you for all the
            kind words, prayers, and attention given. See you on our wedding day!
          </p>
          <p className="eyebrow">With love,</p>
          <Ornament />
          <Monogram first={initials.first} second={initials.second} className="closing-monogram" />
          <h2 className="closing-names">
            {coverNames.groom} &amp; {coverNames.bride}
          </h2>
          <p className="hashtag">{invitation.hashtag}</p>
        </div>
      </section>

      <footer className="footer">
        &copy; {new Date().getFullYear()} {coverNames.groom} &amp; {coverNames.bride}
      </footer>
    </div>
  );
}

export default Rsvp;





