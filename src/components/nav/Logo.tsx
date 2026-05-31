/**
 * Inline logo mark — same visual language as the PWA icon (checkmark inside a
 * progress ring), rendered as SVG so it scales crisply at any size and follows
 * the theme. Used in the sidebar header and the mobile top bar.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0 drop-shadow-sm"
    >
      <defs>
        <linearGradient id="logo-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="logo-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="55%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Tile */}
      <rect x="0" y="0" width="64" height="64" rx="14" ry="14" fill="url(#logo-tile)" />
      {/* Track ring */}
      <circle cx="32" cy="32" r="22" fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="5" />
      {/* Progress arc — same 78% sweep as the PNG icon */}
      <path
        d="M 32 10 A 22 22 0 1 1 14.95 41.39"
        fill="none"
        stroke="url(#logo-ring)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Endpoint dot */}
      <circle cx="14.95" cy="41.39" r="2.5" fill="#34d399" />
      {/* Checkmark */}
      <path
        d="M 22 33 L 29 40 L 43 26"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
