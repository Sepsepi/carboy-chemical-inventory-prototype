import { cn } from "@/lib/utils";
import type { Nfpa } from "@/lib/types";

// NFPA 704 fire diamond. Quadrant colours are fixed by the standard:
// blue = health, red = flammability, yellow = instability, white = special.

const SPECIAL: Record<NonNullable<Nfpa["special"]>, string> = {
  OX: "Oxidizer",
  W: "Reacts with water",
  SA: "Simple asphyxiant",
};

export function NfpaDiamond({
  nfpa,
  size = 72,
  className,
}: {
  nfpa: Nfpa;
  size?: number;
  className?: string;
}) {
  const label = `NFPA 704: health ${nfpa.health}, flammability ${nfpa.flammability}, instability ${nfpa.instability}${
    nfpa.special ? `, ${SPECIAL[nfpa.special]}` : ""
  }`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      <title>{label}</title>
      <g transform="rotate(45 50 50)">
        <rect x="16" y="16" width="34" height="34" className="fill-nfpa-fire" />
        <rect x="50" y="16" width="34" height="34" className="fill-nfpa-instability" />
        <rect x="16" y="50" width="34" height="34" className="fill-nfpa-health" />
        <rect x="50" y="50" width="34" height="34" fill="#fff" />
        <rect x="16" y="16" width="68" height="68" fill="none" stroke="#111827" strokeWidth="2" />
        <path d="M50 16v68M16 50h68" stroke="#111827" strokeWidth="2" />
      </g>
      <g
        fontFamily="var(--font-plex-sans), system-ui, sans-serif"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <text x="50" y="27" fontSize="19" fill="#fff">
          {nfpa.flammability}
        </text>
        <text x="27" y="50" fontSize="19" fill="#fff">
          {nfpa.health}
        </text>
        <text x="73" y="50" fontSize="19" fill="#111827">
          {nfpa.instability}
        </text>
        <text
          x="50"
          y="73"
          fontSize={nfpa.special === "W" ? 17 : 13}
          fill="#111827"
          textDecoration={nfpa.special === "W" ? "line-through" : undefined}
        >
          {nfpa.special ?? ""}
        </text>
      </g>
    </svg>
  );
}

export function nfpaSpecialLabel(nfpa: Nfpa): string | undefined {
  return nfpa.special ? SPECIAL[nfpa.special] : undefined;
}
