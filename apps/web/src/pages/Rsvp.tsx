import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Countdown from "../components/Countdown";
import EventCard from "../components/EventCard";
import Florals from "../components/Florals";
import Monogram from "../components/Monogram";
import Ornament from "../components/Ornament";
import Photo from "../components/Photo";
import { invitation } from "../data/invitation";
import { FlowerBloom } from "../components/Flower";

type Person = (typeof invitation)["groom"];

function PersonCard({ person, photo, seed }: { person: Person; photo: string; seed: number }) {
  return (
    <div className="person">
      <Photo src={photo} label={person.name} className="person-photo" torn={seed} width={200} height={267} />
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

function Rsvp({ ready = true }: { ready?: boolean }) {
  const [searchParams] = useSearchParams();
  const guestName = searchParams.get("to");
  const [reserved, setReserved] = useState(false);
  const [attending, setAttending] = useState("yes");
  const [wished, setWished] = useState(false);
  const { groom, bride, coverNames, initials, photos } = invitation;

  // Fade-up text blocks as they scroll into view. Uses a data attribute (not className) so
  // React re-renders never clobber the state.
  useEffect(() => {
    if (!ready) return;
    const items = document.querySelectorAll<HTMLElement>(".invitation :is(h1, h2, h3, p, blockquote, .person, .couple-name-part, .event-card, .love-story-photo, .couple-row-photo)");
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
      if (el.closest(".event-card") && !el.matches(".event-card")) return;
      if (el.closest(".reservation-card")) return;
      el.dataset.reveal = "hidden";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ready]);



  return (
    <div className={`invitation${ready ? "" : " invitation-awaiting"}`} id="invitation-content" inert={!ready}>
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
        <PersonCard person={groom} photo={photos.groom} seed={11} />
        <br className="couple-amp" />
        <PersonCard person={bride} photo={photos.bride} seed={23} />
      </section>

      <section className="section love-story" aria-labelledby="love-story-title">
        <Florals position="tr" />
        <h2 className="section-title" id="love-story-title">Our Love Story</h2>
        <Photo src={photos.loveStory} label="Our Love Story photo" className="love-story-photo" torn={37} width={261} height={348} />
        <p className="story">{invitation.story}</p>
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
        <p className="lead">Kindly confirm your attendance so we can prepare a seat for you:</p>
        <Ornament />
        <div className="reservation-card">
        <div className="reservation-header">
          <FlowerBloom seed={7} />
          <span className="reservation-header-eyebrow">You are invited</span>
          <span className="reservation-header-title">A seat, a smile, a celebration.</span>
        </div>
        <div className="reservation-details">
        {reserved ? (
          <p className="thank-you" role="status">Thank you for confirming your attendance!</p>
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
        </div>
        </div>
      </section>

      <section className="section portrait">
        <Florals position="tl" />
        <p className="eyebrow">Portrait of Us</p>
        <h2 className="section-title portrait-names">
          {coverNames.groom} &amp; {coverNames.bride}
        </h2>
        <Ornament />
        <div className="couple-photo-row">
          {photos.portraits.map((src, index) => (
            <Photo key={index} src={src} label={`Portrait of us ${index + 1}`} className="couple-row-photo" torn={41 + index * 17} width={261} height={391} />
          ))}
        </div>
        <p className="hashtag">{invitation.hashtag}</p>
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
        <div className="closing-content">
          <p className="closing-note">
            It will be a joy for us if you are able to attend our wedding day. Thank you for all the
            kind words, prayers, and attention given. See you on our wedding day!
          </p>
          <p className="eyebrow">Our Sincere,</p>
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


