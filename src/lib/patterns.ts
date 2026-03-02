/**
 * SVG Pattern definitions for terrain types.
 *
 * Design Philosophy:
 * - Cover = solid rotated rectangles (debris providing cover)
 * - Difficult = diagonal lines (movement hindrance)
 * - Dangerous = X marks (hazard warning)
 * - Combinations layer these elements additively
 *
 * All patterns use a consistent color scheme:
 * - Background: white (#fff)
 * - Foreground: dark gray (#222) for print-friendliness
 */

import type { TerrainType } from './types';

// =============================================================================
// PATTERN CONFIGURATION
// =============================================================================

/** Base pattern tile size */
const TILE_SIZE = 50;

/** Stroke color for all patterns */
const STROKE_COLOR = '#222';

/** Background color */
const BG_COLOR = '#fff';

/** Opacity for layered elements */
const LAYER_OPACITY = 0.5;

// =============================================================================
// PATTERN BUILDING BLOCKS
// =============================================================================

/**
 * Cover pattern element: solid rotated rectangles.
 * Represents debris, rubble, or structures providing cover.
 * Rectangles are fully opaque to cover underlying patterns.
 * Using gray tones to give visual depth while staying opaque.
 */
const COVER_RECTANGLES = `
  <rect x="8" y="10" width="14" height="11" fill="#444" transform="rotate(15 15 15.5)"/>
  <rect x="30" y="28" width="11" height="9" fill="#555" transform="rotate(-12 35.5 32.5)"/>
  <rect x="18" y="38" width="9" height="7" fill="#666" transform="rotate(25 22.5 41.5)"/>
  <rect x="38" y="6" width="8" height="10" fill="#666" transform="rotate(-20 42 11)"/>
`;

/**
 * Difficult pattern element: diagonal lines.
 * Represents terrain that slows movement.
 * Uses a smaller tile for denser lines.
 */
const DIFFICULT_TILE = 12;
const DIFFICULT_DIAGONALS = `
  <line x1="0" y1="${DIFFICULT_TILE}" x2="${DIFFICULT_TILE}" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
`;

/**
 * Dangerous pattern element: X marks.
 * Smaller X marks, densely packed to ensure visibility in every hex.
 */
const DANGEROUS_TILE = 16;
const DANGEROUS_X_MARKS = `
  <line x1="4" y1="4" x2="12" y2="12" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
  <line x1="12" y1="4" x2="4" y2="12" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
`;

/**
 * Muted diagonal lines for combo patterns (denser).
 */
const MUTED_DIAGONALS = `
  <line x1="0" y1="12" x2="12" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="0" y1="24" x2="24" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="0" y1="36" x2="36" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="0" y1="48" x2="48" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="12" y1="50" x2="50" y2="12" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="24" y1="50" x2="50" y2="24" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="36" y1="50" x2="50" y2="36" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
`;

/**
 * Dense crosshatch for cover+difficult+dangerous.
 */
const DENSE_CROSSHATCH = `
  <g stroke="${STROKE_COLOR}" stroke-width="2" opacity="${LAYER_OPACITY}">
    <line x1="0" y1="0" x2="12" y2="12"/>
    <line x1="12" y1="0" x2="0" y2="12"/>
    <line x1="12" y1="0" x2="24" y2="12"/>
    <line x1="24" y1="0" x2="12" y2="12"/>
    <line x1="24" y1="0" x2="36" y2="12"/>
    <line x1="36" y1="0" x2="24" y2="12"/>
    <line x1="36" y1="0" x2="48" y2="12"/>
    <line x1="48" y1="0" x2="36" y2="12"/>
    <line x1="0" y1="12" x2="12" y2="24"/>
    <line x1="12" y1="12" x2="0" y2="24"/>
    <line x1="12" y1="12" x2="24" y2="24"/>
    <line x1="24" y1="12" x2="12" y2="24"/>
    <line x1="24" y1="12" x2="36" y2="24"/>
    <line x1="36" y1="12" x2="24" y2="24"/>
    <line x1="36" y1="12" x2="48" y2="24"/>
    <line x1="48" y1="12" x2="36" y2="24"/>
    <line x1="0" y1="24" x2="12" y2="36"/>
    <line x1="12" y1="24" x2="0" y2="36"/>
    <line x1="12" y1="24" x2="24" y2="36"/>
    <line x1="24" y1="24" x2="12" y2="36"/>
    <line x1="24" y1="24" x2="36" y2="36"/>
    <line x1="36" y1="24" x2="24" y2="36"/>
    <line x1="36" y1="24" x2="48" y2="36"/>
    <line x1="48" y1="24" x2="36" y2="36"/>
    <line x1="0" y1="36" x2="12" y2="48"/>
    <line x1="12" y1="36" x2="0" y2="48"/>
    <line x1="12" y1="36" x2="24" y2="48"/>
    <line x1="24" y1="36" x2="12" y2="48"/>
    <line x1="24" y1="36" x2="36" y2="48"/>
    <line x1="36" y1="36" x2="24" y2="48"/>
    <line x1="36" y1="36" x2="48" y2="48"/>
    <line x1="48" y1="36" x2="36" y2="48"/>
  </g>
`;

// =============================================================================
// PATTERN DEFINITIONS
// =============================================================================

interface PatternDef {
  id: string;
  width: number;
  height: number;
  content: string;
}

const PATTERN_DEFS: Record<TerrainType, PatternDef | null> = {
  // Open terrain has no pattern (white fill)
  open: null,

  // Blocking: solid dark fill (handled separately, not a pattern)
  blocking: null,

  // Impassable: wavy lines on gray background (can see through, can't enter)
  impassable: {
    id: 'pattern-impassable',
    width: 20,
    height: 12,
    content: `
      <rect width="20" height="12" fill="#e0e0e0"/>
      <path d="M0,6 Q5,2 10,6 T20,6" stroke="${STROKE_COLOR}" stroke-width="2.5" fill="none" opacity="0.6"/>
    `,
  },

  // Cover: solid rotated rectangles
  cover: {
    id: 'pattern-cover',
    width: TILE_SIZE,
    height: TILE_SIZE,
    content: `
      <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${BG_COLOR}"/>
      ${COVER_RECTANGLES}
    `,
  },

  // Difficult: diagonal lines (smaller tile for denser pattern)
  difficult: {
    id: 'pattern-difficult',
    width: DIFFICULT_TILE,
    height: DIFFICULT_TILE,
    content: `
      <rect width="${DIFFICULT_TILE}" height="${DIFFICULT_TILE}" fill="${BG_COLOR}"/>
      ${DIFFICULT_DIAGONALS}
    `,
  },

  // Dangerous: X marks (smaller tile ensures X in every hex)
  dangerous: {
    id: 'pattern-dangerous',
    width: DANGEROUS_TILE,
    height: DANGEROUS_TILE,
    content: `
      <rect width="${DANGEROUS_TILE}" height="${DANGEROUS_TILE}" fill="${BG_COLOR}"/>
      ${DANGEROUS_X_MARKS}
    `,
  },

  // Cover + Difficult: rectangles with muted diagonals
  'cover-difficult': {
    id: 'pattern-cover-difficult',
    width: TILE_SIZE,
    height: TILE_SIZE,
    content: `
      <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${BG_COLOR}"/>
      ${MUTED_DIAGONALS}
      ${COVER_RECTANGLES}
    `,
  },

  // Cover + Dangerous: rectangles with small X marks overlay
  'cover-dangerous': {
    id: 'pattern-cover-dangerous',
    width: TILE_SIZE,
    height: TILE_SIZE,
    content: `
      <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${BG_COLOR}"/>
      ${COVER_RECTANGLES}
      <g>
        <line x1="2" y1="2" x2="10" y2="10" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="10" y1="2" x2="2" y2="10" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="22" y1="18" x2="30" y2="26" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="30" y1="18" x2="22" y2="26" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="40" y1="40" x2="48" y2="48" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="48" y1="40" x2="40" y2="48" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="6" y1="32" x2="14" y2="40" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="14" y1="32" x2="6" y2="40" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
      </g>
    `,
  },

  // Difficult + Dangerous: dense diagonals with small X marks
  'difficult-dangerous': {
    id: 'pattern-difficult-dangerous',
    width: TILE_SIZE,
    height: TILE_SIZE,
    content: `
      <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${BG_COLOR}"/>
      <g>
        <line x1="0" y1="12" x2="12" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="0" y1="24" x2="24" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="0" y1="36" x2="36" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="0" y1="48" x2="48" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="12" y1="50" x2="50" y2="12" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="24" y1="50" x2="50" y2="24" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="36" y1="50" x2="50" y2="36" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
      </g>
      <g>
        <line x1="2" y1="2" x2="10" y2="10" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="10" y1="2" x2="2" y2="10" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="22" y1="18" x2="30" y2="26" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="30" y1="18" x2="22" y2="26" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="40" y1="40" x2="48" y2="48" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="48" y1="40" x2="40" y2="48" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="6" y1="32" x2="14" y2="40" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="14" y1="32" x2="6" y2="40" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
      </g>
    `,
  },

  // Cover + Difficult + Dangerous: dense crosshatch with rectangles
  'cover-difficult-dangerous': {
    id: 'pattern-cover-difficult-dangerous',
    width: TILE_SIZE,
    height: TILE_SIZE,
    content: `
      <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${BG_COLOR}"/>
      ${DENSE_CROSSHATCH}
      <rect x="8" y="10" width="14" height="11" fill="#444" transform="rotate(15 15 15.5)"/>
      <rect x="30" y="28" width="11" height="9" fill="#555" transform="rotate(-12 35.5 32.5)"/>
    `,
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Get the pattern ID for a terrain type.
 * Returns null for open (white) and blocking (solid dark).
 */
export function getPatternId(terrain: TerrainType): string | null {
  const def = PATTERN_DEFS[terrain];
  return def ? def.id : null;
}

/**
 * Get the fill value for a terrain type.
 * This is what goes in the SVG fill attribute.
 */
export function getTerrainFill(terrain: TerrainType): string {
  if (terrain === 'open') return '#ffffff';
  if (terrain === 'blocking') return '#1a1a1a';

  const patternId = getPatternId(terrain);
  return patternId ? `url(#${patternId})` : '#ffffff';
}

/**
 * Generate all SVG pattern definitions as a string.
 * This should be included in the SVG's <defs> section.
 */
export function generatePatternDefs(): string {
  const patterns: string[] = [];

  for (const [, def] of Object.entries(PATTERN_DEFS)) {
    if (def) {
      patterns.push(`
        <pattern id="${def.id}" patternUnits="userSpaceOnUse" width="${def.width}" height="${def.height}">
          ${def.content}
        </pattern>
      `);
    }
  }

  return patterns.join('\n');
}

/**
 * Get display name for a terrain type.
 */
export function getTerrainDisplayName(terrain: TerrainType): string {
  const names: Record<TerrainType, string> = {
    open: 'Open',
    blocking: 'Blocking',
    impassable: 'Impassable',
    cover: 'Cover',
    difficult: 'Difficult',
    dangerous: 'Dangerous',
    'cover-difficult': 'Cover + Difficult',
    'cover-dangerous': 'Cover + Dangerous',
    'difficult-dangerous': 'Difficult + Dangerous',
    'cover-difficult-dangerous': 'Cover + Difficult + Dangerous',
  };
  return names[terrain];
}
