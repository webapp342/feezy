/** Brand SVG icons — purple/yellow/lime locked to Feezy kit. */

type P = { className?: string };

export function IconCopy({ className }: P) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconExternal({ className }: P) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 5h5v5M10 14 19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconX({ className }: P) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.5l-5.1-6.7L5.7 22H2.6l7.3-8.3L1 2h6.7l4.6 6.1L18.9 2Zm-1.1 18h1.8L7.3 4H5.4l12.4 16Z" />
    </svg>
  );
}

export function IconTelegram({ className }: P) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.8 4.2 2.9 11.5c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 5.7c.2.7.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8L22.9 5.3c.3-1.2-.5-1.7-1.1-1.1ZM9.2 14.7l-.3 3.5 1.4-2.5 8.3-7.5-9.4 6.5Z" />
    </svg>
  );
}

export function IconChart({ className }: P) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 15v-4M12 15V8M16 15v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPump({ className }: P) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14c1.5 2 6.5 2 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconSolana({ className }: P) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5.4 16.3c.1-.1.3-.2.5-.2h14.4c.3 0 .5.4.3.6l-2.3 2.4c-.1.1-.3.2-.5.2H3.4c-.3 0-.5-.4-.3-.6l2.3-2.4Zm0-11.2c.1-.1.3-.2.5-.2h14.4c.3 0 .5.4.3.6l-2.3 2.4c-.1.1-.3.2-.5.2H3.4c-.3 0-.5-.4-.3-.6l2.3-2.4Zm16.9 5.4-2.3-2.4c-.1-.1-.3-.2-.5-.2H5.9c-.3 0-.5.4-.3.6l2.3 2.4c.1.1.3.2.5.2h13.6c.3 0 .5-.4.3-.6Z" />
    </svg>
  );
}

/** Simplified Feezy head mark — matches kit DNA (lime mohawk, gold glasses). */
export function FeezyMark({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 64 64" width="40" height="40" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#1a0033" stroke="#FFE600" strokeWidth="3" />
      <ellipse cx="32" cy="36" rx="18" ry="16" fill="#4a4a4a" />
      <ellipse cx="32" cy="34" rx="14" ry="10" fill="#d8d8d8" />
      <path d="M18 22c4-8 8-10 14-8 6-2 10 0 14 8" fill="#C8FF00" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="24" cy="34" r="5" fill="#111" />
      <circle cx="40" cy="34" r="5" fill="#111" />
      <circle cx="24.5" cy="33.5" r="2.2" fill="#C8FF00" />
      <circle cx="40.5" cy="33.5" r="2.2" fill="#C8FF00" />
      <rect x="20" y="36" width="24" height="5" rx="2.5" fill="#0a0a0a" stroke="#FFE600" strokeWidth="1.5" />
      <path d="M26 44c3 3 9 3 12 0" stroke="#0a0a0a" strokeWidth="2" fill="none" />
      <rect x="36" y="42" width="3" height="3" rx="0.5" fill="#FFE600" />
    </svg>
  );
}

export function StampBadge({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 160 160" width="140" height="140" aria-hidden>
      <circle cx="80" cy="80" r="74" fill="#FFE600" />
      <circle cx="80" cy="80" r="62" fill="none" stroke="#1a0033" strokeWidth="3" strokeDasharray="6 5" />
      <path d="M80 38 L92 70 H126 L98 90 L110 122 L80 102 L50 122 L62 90 L34 70 H68 Z" fill="#1a0033" />
      <text x="80" y="28" textAnchor="middle" fill="#1a0033" fontSize="9" fontWeight="800" fontFamily="Arial,sans-serif">
        APE $FEEZY
      </text>
      <text x="80" y="148" textAnchor="middle" fill="#1a0033" fontSize="9" fontWeight="800" fontFamily="Arial,sans-serif">
        ON PUMP.FUN
      </text>
    </svg>
  );
}
