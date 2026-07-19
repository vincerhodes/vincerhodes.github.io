// The T&R crest, shared by the header, footer, and memo letterhead.
// Markup verbatim from the source site's brand block.
export default function TrCrest({ className = "brand__crest" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 4 L58 14 V30 C58 46 47 57 32 60 C17 57 6 46 6 30 V14 Z"
        fill="none"
        strokeWidth="2.5"
      />
      <text
        x="32"
        y="40"
        fontFamily="Georgia, serif"
        fontSize="20"
        fontWeight="700"
        textAnchor="middle"
      >
        T&amp;R
      </text>
    </svg>
  );
}
