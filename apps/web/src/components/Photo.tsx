// A photo slot. Without a src it shows a palette-tinted placeholder; with a src the same tint
// overlay is applied so real photos blend into the color scheme.
function Photo({ src, label, className = "" }: { src: string; label: string; className?: string }) {
  return (
    <div
      className={`photo ${className}`}
      style={src ? { backgroundImage: `url(${src})` } : undefined}
      role="img"
      aria-label={label}
    />
  );
}

export default Photo;
