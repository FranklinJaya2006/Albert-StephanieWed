import Photo from "./Photo";

function GalleryGrid({ photos }: { photos: string[] }) {
  return (
    <div className="gallery-grid">
      {photos.map((src, i) => (
        <Photo key={i} src={src} label={`Gallery photo ${i + 1}`} className="gallery-photo" />
      ))}
    </div>
  );
}

export default GalleryGrid;
