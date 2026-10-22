// A photo slot. Without a src it shows a palette-tinted placeholder; real photos render untinted.
function Photo({ src, label, className = "" }: { src: string; label: string; className?: string }) {
  return (
    <div
      className={`photo ${className}`}
      style={src ? { backgroundImage: `url(${src})` } : undefined}
      data-empty={src ? undefined : ""}
      role="img"
      aria-label={label}
    />
  );
}

export default Photo;
