import Photo from "./Photo";
import PhotoBorderOrnament from "./PhotoBorderOrnament";

// Every content photo (groom, bride, love story, gallery) gets this one frame, so they all match.
// `className` goes on the frame and sets its size and aspect ratio.
function FramedPhoto({ src, label, className = "" }: { src: string; label: string; className?: string }) {
  return (
    <div className={`photo-frame ${className}`}>
      <Photo src={src} label={label} className="framed-photo" />
      <PhotoBorderOrnament />
    </div>
  );
}

export default FramedPhoto;
