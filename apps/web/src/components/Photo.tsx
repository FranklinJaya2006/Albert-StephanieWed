import type { CSSProperties } from "react";
import { tornEdge } from "../lib/torn";

// A photo slot. Without a src it shows a palette-tinted placeholder; real photos render untinted.
// Pass `torn` (any number; it seeds the shape) for a ripped edge. Give the photo's real
// width/height (px) so the tear density stays right.
function Photo({
  src,
  label,
  className = "",
  torn,
  width,
  height,
}: {
  src: string;
  label: string;
  className?: string;
  torn?: number;
  width?: number;
  height?: number;
}) {
  const style: CSSProperties = {};
  if (src) style.backgroundImage = `url(${src})`;
  if (torn !== undefined) style.clipPath = tornEdge(torn, width, height);
  return (
    <div
      className={`photo ${className}`}
      style={Object.keys(style).length ? style : undefined}
      data-empty={src ? undefined : ""}
      role="img"
      aria-label={label}
    />
  );
}

export default Photo;
