/**
 * SVG pattern definitions for property-based terrain types
 * 
 * EXACT copy from pattern-additive-test.html - these patterns work perfectly
 * in the test page and should work here with our custom renderer.
 */

export const TERRAIN_PATTERNS: Record<string, string> = {
  // IMPASSABLE: Gray + wavy lines (can't enter, CAN see through)
  impassable: `<pattern id="pattern-impassable" patternUnits="userSpaceOnUse" width="20" height="12">
    <rect width="20" height="12" fill="#e8e8e8"/>
    <path d="M0,6 Q5,2 10,6 T20,6" stroke="#222" stroke-width="2.5" fill="none" opacity="0.6"/>
  </pattern>`,

  // COVER: Scattered rotated squares
  cover: `<pattern id="pattern-cover" patternUnits="userSpaceOnUse" width="50" height="50">
    <rect width="50" height="50" fill="#fff"/>
    <rect x="8" y="10" width="12" height="10" fill="#222" opacity="0.7" transform="rotate(15 14 15)"/>
    <rect x="30" y="28" width="10" height="8" fill="#222" opacity="0.65" transform="rotate(-10 35 32)"/>
    <rect x="18" y="38" width="8" height="6" fill="#222" opacity="0.6" transform="rotate(25 22 41)"/>
    <rect x="38" y="8" width="7" height="9" fill="#222" opacity="0.6" transform="rotate(-20 41 12)"/>
  </pattern>`,

  // DIFFICULT: Diagonal lines
  difficult: `<pattern id="pattern-difficult" patternUnits="userSpaceOnUse" width="14" height="14">
    <rect width="14" height="14" fill="#fff"/>
    <line x1="0" y1="14" x2="14" y2="0" stroke="#222" stroke-width="3" opacity="0.5"/>
  </pattern>`,

  // DANGEROUS: X marks
  dangerous: `<pattern id="pattern-dangerous" patternUnits="userSpaceOnUse" width="14" height="14">
    <rect width="14" height="14" fill="#fff"/>
    <line x1="3" y1="3" x2="11" y2="11" stroke="#222" stroke-width="2.5"/>
    <line x1="11" y1="3" x2="3" y2="11" stroke="#222" stroke-width="2.5"/>
  </pattern>`,

  // COVER + DIFFICULT: Square on muted diagonals
  'cover-difficult': `<pattern id="pattern-cover-difficult" patternUnits="userSpaceOnUse" width="28" height="28">
    <rect width="28" height="28" fill="#fff"/>
    <line x1="0" y1="14" x2="14" y2="0" stroke="#222" stroke-width="3" opacity="0.3"/>
    <line x1="14" y1="28" x2="28" y2="14" stroke="#222" stroke-width="3" opacity="0.3"/>
    <line x1="0" y1="28" x2="28" y2="0" stroke="#222" stroke-width="3" opacity="0.3"/>
    <rect x="6" y="7" width="12" height="10" fill="#222" opacity="0.7" transform="rotate(12 12 12)"/>
  </pattern>`,

  // COVER + DANGEROUS: Squares with tiny X's
  'cover-dangerous': `<pattern id="pattern-cover-dangerous" patternUnits="userSpaceOnUse" width="50" height="50">
    <rect width="50" height="50" fill="#fff"/>
    <rect x="8" y="10" width="12" height="10" fill="#222" opacity="0.7" transform="rotate(15 14 15)"/>
    <rect x="30" y="28" width="10" height="8" fill="#222" opacity="0.65" transform="rotate(-10 35 32)"/>
    <rect x="18" y="38" width="8" height="6" fill="#222" opacity="0.6" transform="rotate(25 22 41)"/>
    <rect x="38" y="8" width="7" height="9" fill="#222" opacity="0.6" transform="rotate(-20 41 12)"/>
    <g stroke="#222" stroke-width="2">
      <line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/>
    </g>
    <g stroke="#222" stroke-width="2">
      <line x1="25" y1="18" x2="31" y2="24"/><line x1="31" y1="18" x2="25" y2="24"/>
    </g>
    <g stroke="#222" stroke-width="2">
      <line x1="42" y1="42" x2="48" y2="48"/><line x1="48" y1="42" x2="42" y2="48"/>
    </g>
    <g stroke="#222" stroke-width="2">
      <line x1="7" y1="28" x2="13" y2="34"/><line x1="13" y1="28" x2="7" y2="34"/>
    </g>
  </pattern>`,

  // DIFFICULT + DANGEROUS: Diagonal with tiny X's
  'difficult-dangerous': `<pattern id="pattern-difficult-dangerous" patternUnits="userSpaceOnUse" width="14" height="14">
    <rect width="14" height="14" fill="#fff"/>
    <line x1="0" y1="14" x2="14" y2="0" stroke="#222" stroke-width="3" opacity="0.5"/>
    <g stroke="#222" stroke-width="1.5">
      <line x1="2" y1="2" x2="5" y2="5"/><line x1="5" y1="2" x2="2" y2="5"/>
    </g>
    <g stroke="#222" stroke-width="1.5">
      <line x1="9" y1="9" x2="12" y2="12"/><line x1="12" y1="9" x2="9" y2="12"/>
    </g>
  </pattern>`,

  // COVER + DIFFICULT + DANGEROUS: Crosshatch with squares
  'cover-difficult-dangerous': `<pattern id="pattern-cover-difficult-dangerous" patternUnits="userSpaceOnUse" width="50" height="50">
    <rect width="50" height="50" fill="#fff"/>
    <line x1="0" y1="0" x2="12" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="0" x2="0" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="0" x2="24" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="0" x2="12" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="0" x2="36" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="0" x2="24" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="0" x2="48" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="48" y1="0" x2="36" y2="12" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="0" y1="12" x2="12" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="12" x2="0" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="12" x2="24" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="12" x2="12" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="12" x2="36" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="12" x2="24" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="12" x2="48" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="48" y1="12" x2="36" y2="24" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="0" y1="24" x2="12" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="24" x2="0" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="24" x2="24" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="24" x2="12" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="24" x2="36" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="24" x2="24" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="24" x2="48" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="48" y1="24" x2="36" y2="36" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="0" y1="36" x2="12" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="36" x2="0" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="36" x2="24" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="36" x2="12" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="24" y1="36" x2="36" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="36" x2="24" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="36" y1="36" x2="48" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <line x1="48" y1="36" x2="36" y2="48" stroke="#222" stroke-width="2" opacity="0.5"/>
    <rect x="8" y="10" width="12" height="10" fill="#222" opacity="0.7" transform="rotate(15 14 15)"/>
    <rect x="30" y="28" width="10" height="8" fill="#222" opacity="0.65" transform="rotate(-10 35 32)"/>
  </pattern>`,
};

/**
 * Get all pattern definitions as an array (for backwards compatibility)
 */
export function getAllPatterns(): string[] {
  return Object.values(TERRAIN_PATTERNS);
}
