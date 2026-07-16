export default function Reel({ size = 22, spinning = false, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`${spinning ? "animate-reel" : ""} ${className}`}
    >
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.9" />
      <circle cx="32" cy="32" r="6" fill="currentColor" />
      <circle cx="18" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="46" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="20" cy="46" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="44" cy="46" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}
