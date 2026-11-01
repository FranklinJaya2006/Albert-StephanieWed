import { useState } from "react";
import FramedPhoto from "./FramedPhoto";

export default function PhotoCarousel({ photos }: { photos: string[] }) {
  const [current, setCurrent] = useState(0);
  if (!photos.length) return null;
  const index = Math.min(current, photos.length - 1);
  return (
    <div className="photo-carousel" role="region" aria-roledescription="carousel" aria-label="Portrait of Us">
      <div className="carousel-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${photos.length}`}>
        <FramedPhoto key={`${index}-${photos[index]}`} src={photos[index]} label={`Portrait of us ${index + 1}`} className="carousel-photo" />
      </div>
      <div className="carousel-controls">
        <button type="button" aria-label="Previous photo" disabled={photos.length < 2} onClick={() => setCurrent((index - 1 + photos.length) % photos.length)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <span role="status" aria-live="polite">{index + 1} / {photos.length}</span>
        <button type="button" aria-label="Next photo" disabled={photos.length < 2} onClick={() => setCurrent((index + 1) % photos.length)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}

