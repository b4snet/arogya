interface ArogyaMarkProps {
  className?: string;
}

/**
 * Original Arogya mark: an orbit ring around a health trace. Deliberately not a NASA
 * insignia and never presented as agency endorsement.
 */
export function ArogyaMark({ className = 'h-8 w-8' }: ArogyaMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Arogya mark"
      fill="none"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
      <ellipse
        cx="20"
        cy="20"
        rx="17"
        ry="6.5"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="1.2"
        transform="rotate(-24 20 20)"
      />
      <path
        d="M8 21h5.4l2.6-6 4 12 3.2-8.4 2.2 2.4H32"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="21" r="1.9" fill="currentColor" />
    </svg>
  );
}
