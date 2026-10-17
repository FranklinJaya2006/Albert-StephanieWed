import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Countdown from "../components/Countdown";
import EventCard from "../components/EventCard";
import Florals from "../components/Florals";
import Monogram from "../components/Monogram";
import Ornament from "../components/Ornament";
import Photo from "../components/Photo";
import { invitation } from "../data/invitation";

type Person = (typeof invitation)["groom"];

function PersonCard({ person, photo }: { person: Person; photo: string }) {
  return (
    <div className="person">
      <Photo src={photo} label={person.name} className="person-photo" />
      <h3 className="person-name">{person.name}</h3>
      <p className="person-parents">
        {person.parentsLabel}
        <br />
        {person.father}
        <br />
        and {person.mother}
      </p>
      <p className="person-social">{person.instagram}</p>
    </div>
  );
}

function Rsvp() {
  const location = useLocation();
  const [opening, setOpening] = useState(location.state?.curtainReveal === true);
  const [searchParams] = useSearchParams();
  const guestName = searchParams.get("to");
  const [reserved, setReserved] = useState(false);
  const [attending, setAttending] = useState("yes");
  const [wished, setWished] = useState(false);
  const { groom, bride, initials, photos } = invitation;

  // Fade-up text blocks as they scroll into view. Uses a data attribute (not className) so
  // React re-renders never clobber the state.
  useEffect(() => {
    if (opening) return;
    const items = document.querySelectorAll<HTMLElement>(".invitation :is(h1, h2, h3, p, blockquote, .person, .couple-name-part)");
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
    items.forEach((el) => {
      if (el.matches(".couple-names")) return;
      if (el.closest(".person") && !el.matches(".person")) return;
      el.dataset.reveal = "hidden";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [opening]);

  useEffect(() => {
    if (!opening) return;
    window.scrollTo(0, 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [opening]);

  return (
    <main className={`invitation${opening ? " invitation-opening" : ""}`} inert={opening}>
      {opening && (
        <div className="opening-curtain" aria-hidden="true">
          <div className="curtain-panel curtain-left" />
          <div className="curtain-panel curtain-right" onAnimationEnd={() => setOpening(false)} />
        </div>
      )}
      <section className="section welcome">
        <Florals position="tl" />
        <Florals position="tr" />
        <p className="dear">Dear Mr/Mrs/Ms,</p>
        <h2 className="guest-name">{guestName ?? "Our Honored Guest"}</h2>
        <Ornament />
        <p className="lead">
          By the grace of God and the blessings of our families, we cordially request the honour of
          your presence at the wedding of
        </p>
        <h1 className="couple-names">
          <span className="couple-name-part">{groom.name}</span>
          <span className="amp couple-name-part">&amp;</span>
          <span className="couple-name-part">{bride.name}</span>
        </h1>
        <blockquote className="quote">
          &ldquo;{invitation.quote.text}&rdquo;
          <cite>{invitation.quote.source}</cite>
        </blockquote>
      </section>

      <section className="section couple">
        <Florals position="bl" />
        <Florals position="br" />
        <h2 className="section-title">The Groom &amp; Bride</h2>
        <Ornament />
        <PersonCard person={groom} photo={photos.groom} />
        <p className="and">and</p>
        <PersonCard person={bride} photo={photos.bride} />
      </section>

      <section className="section section-dark">
        <h2 className="section-title">When &amp; Where</h2>
        <Ornament />
        <Countdown target={invitation.eventDateTime} />
        <p className="eyebrow save-the-date">Save the Date</p>
        <div className="events">
          <EventCard {...invitation.ceremony} />
          <EventCard {...invitation.reception} />
        </div>
      </section>

      <section className="section reservation">
        <Florals position="tr" />
        <h2 className="section-title">Reservation</h2>
        <p className="lead">Kindly confirm your attendance so we can prepare a seat for you:</p>
        <Ornament />
        {reserved ? (
          <p className="thank-you">Thank you for confirming your attendance!</p>
        ) : (
          <form
            className="wish-form"
            onSubmit={(e) => {
              e.preventDefault();
              setReserved(true);
            }}
          >
            <label>
              Your Name
              <input name="name" defaultValue={guestName ?? ""} required />
            </label>
            <label>
              Attendance
              <select name="attending" value={attending} onChange={(e) => setAttending(e.target.value)}>
                <option value="yes">Will attend</option>
                <option value="no">Unable to attend</option>
              </select>
            </label>
            {attending === "yes" && (
              <>
                <label>
                  Which event will you attend?
                  <select name="event" defaultValue="both">
                    <option value="both">Both events</option>
                    <option value="ceremony">{invitation.ceremony.label}</option>
                    <option value="reception">{invitation.reception.label}</option>
                  </select>
                </label>
                <label>
                  How many guests will be attending?
                  <select name="guests" defaultValue="1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "person" : "people"}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <button type="submit" className="button">
              Confirm
            </button>
          </form>
        )}
      </section>

      <section className="section portrait">
        <Florals position="tl" />
        <p className="eyebrow">Portrait of Us</p>
        <h2 className="section-title portrait-names">
          {groom.name} &amp; {bride.name}
        </h2>
        <Ornament />
        <Photo src={photos.portrait} label="Portrait of the couple" className="portrait-photo" />
        <p className="hashtag">{invitation.hashtag}</p>
        <p className="story">{invitation.story}</p>
        <div className="gallery-preview">
          {photos.gallery.slice(0, 2).map((src, i) => (
            <Photo key={i} src={src} label={`Gallery photo ${i + 1}`} className="gallery-preview-photo" />
          ))}
        </div>
        <Link className="button view-more" to={guestName ? `/gallery?to=${encodeURIComponent(guestName)}` : "/gallery"}>
          View More
        </Link>
      </section>

      <section className="section kind-words">
        <Florals position="bl" />
        <h2 className="section-title">Kind Words</h2>
        <p className="lead">Please leave your sincere prayer and wishes to us and our families:</p>
        <Ornament />
        {wished ? (
          <p className="thank-you">Thank you for your kind words and prayers!</p>
        ) : (
          <form
            className="wish-form"
            onSubmit={(e) => {
              e.preventDefault();
              setWished(true);
            }}
          >
            <label>
              Your Name
              <input name="name" defaultValue={guestName ?? ""} required />
            </label>
            <label>
              Prayer &amp; Wishes
              <textarea name="message" rows={4} required />
            </label>
            <button type="submit" className="button">
              Send Wishes
            </button>
          </form>
        )}
      </section>

      <section className="closing">
        <Photo src={photos.closing} label="Closing photo" className="closing-photo" />
        <div className="closing-content">
          <p className="closing-note">
            It will be a joy for us if you are able to attend our wedding day. Thank you for all the
            kind words, prayers, and attention given. See you on our wedding day!
          </p>
          <p className="eyebrow">Our Sincere,</p>
          <Ornament />
          <Monogram first={initials.first} second={initials.second} className="closing-monogram" />
          <h2 className="closing-names">
            {groom.name} &amp; {bride.name}
          </h2>
          <p className="hashtag">{invitation.hashtag}</p>
        </div>
      </section>

      <footer className="footer">
        &copy; {new Date().getFullYear()} {groom.name} &amp; {bride.name}
      </footer>
    </main>
  );
}

export default Rsvp;
