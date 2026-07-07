// The Flint "Origin Mark" — thin ring + Electric Cyan centre dot. The ring uses
// currentColor so it adapts to light/dark; the dot is brand cyan. Set `rings`
// for the concentric hero variant. Set `mono` on colored backgrounds (the blue
// hero panels): the whole mark renders in currentColor — the standard
// monochrome logo treatment — because the cyan dot has no contrast on blue.
export function OriginMark({
  size = 22,
  rings = false,
  mono = false,
  className,
}: {
  size?: number;
  rings?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <circle cx="12" cy="12" r="10.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {rings && (
        <circle cx="12" cy="12" r="6.6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      )}
      <circle cx="12" cy="12" r="3.4" fill={mono ? "currentColor" : "var(--et-cyan)"} />
    </svg>
  );
}
