import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import GalleryGrid from "../components/GalleryGrid";
import Ornament from "../components/Ornament";
import { invitation } from "../data/invitation";

function Gallery() {
  const [searchParams] = useSearchParams();
  const guestName = searchParams.get("to");
  const backHref = guestName ? `/rsvp?to=${encodeURIComponent(guestName)}` : "/rsvp";
  const { groom, bride, photos } = invitation;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="invitation gallery-page">
      <section className="section">
        <p className="eyebrow">More Capture of Us</p>
        <h2 className="section-title portrait-names">
          {groom.name} &amp; {bride.name}
        </h2>
        <Ornament />
        <GalleryGrid photos={photos.gallery} />
        <Link className="button view-more" to={backHref}>
          Back to Invitation
        </Link>
      </section>
    </main>
  );
}

export default Gallery;
