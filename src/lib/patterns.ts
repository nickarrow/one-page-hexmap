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

/** Base pattern tile size - smaller than hex to ensure visibility */
const TILE_SIZE = 32;

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
 * Designed with a central rectangle that's always visible,
 * plus corner rectangles for variety when tiles repeat.
 * Tile size matches hex dimensions to ensure at least one rectangle per hex.
 */
const COVER_RECTANGLES = `
  <rect x="10" y="10" width="12" height="10" fill="#444" transform="rotate(12 16 15)"/>
  <rect x="2" y="2" width="8" height="6" fill="#555" transform="rotate(-15 6 5)"/>
  <rect x="22" y="22" width="8" height="6" fill="#555" transform="rotate(20 26 25)"/>
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
 * Smaller tile ensures X marks appear in every hex.
 * X is centered in the tile.
 */
const DANGEROUS_TILE = 14;
const DANGEROUS_X_MARKS = `
  <line x1="3" y1="3" x2="11" y2="11" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
  <line x1="11" y1="3" x2="3" y2="11" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
`;

/**
 * Muted diagonal lines for combo patterns.
 * Sized for 32px tile.
 */
const MUTED_DIAGONALS = `
  <line x1="0" y1="8" x2="8" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="0" y1="16" x2="16" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="0" y1="24" x2="24" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="0" y1="32" x2="32" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="8" y1="32" x2="32" y2="8" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="16" y1="32" x2="32" y2="16" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
  <line x1="24" y1="32" x2="32" y2="24" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.3"/>
`;

/**
 * Dense crosshatch for cover+difficult+dangerous.
 * Sized for 32px tile.
 */
const DENSE_CROSSHATCH = `
  <g stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="${LAYER_OPACITY}">
    <line x1="0" y1="0" x2="8" y2="8"/>
    <line x1="8" y1="0" x2="0" y2="8"/>
    <line x1="8" y1="0" x2="16" y2="8"/>
    <line x1="16" y1="0" x2="8" y2="8"/>
    <line x1="16" y1="0" x2="24" y2="8"/>
    <line x1="24" y1="0" x2="16" y2="8"/>
    <line x1="24" y1="0" x2="32" y2="8"/>
    <line x1="32" y1="0" x2="24" y2="8"/>
    <line x1="0" y1="8" x2="8" y2="16"/>
    <line x1="8" y1="8" x2="0" y2="16"/>
    <line x1="8" y1="8" x2="16" y2="16"/>
    <line x1="16" y1="8" x2="8" y2="16"/>
    <line x1="16" y1="8" x2="24" y2="16"/>
    <line x1="24" y1="8" x2="16" y2="16"/>
    <line x1="24" y1="8" x2="32" y2="16"/>
    <line x1="32" y1="8" x2="24" y2="16"/>
    <line x1="0" y1="16" x2="8" y2="24"/>
    <line x1="8" y1="16" x2="0" y2="24"/>
    <line x1="8" y1="16" x2="16" y2="24"/>
    <line x1="16" y1="16" x2="8" y2="24"/>
    <line x1="16" y1="16" x2="24" y2="24"/>
    <line x1="24" y1="16" x2="16" y2="24"/>
    <line x1="24" y1="16" x2="32" y2="24"/>
    <line x1="32" y1="16" x2="24" y2="24"/>
    <line x1="0" y1="24" x2="8" y2="32"/>
    <line x1="8" y1="24" x2="0" y2="32"/>
    <line x1="8" y1="24" x2="16" y2="32"/>
    <line x1="16" y1="24" x2="8" y2="32"/>
    <line x1="16" y1="24" x2="24" y2="32"/>
    <line x1="24" y1="24" x2="16" y2="32"/>
    <line x1="24" y1="24" x2="32" y2="32"/>
    <line x1="32" y1="24" x2="24" y2="32"/>
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

  // Cover + Dangerous: rectangles with X marks positioned to avoid overlap
  'cover-dangerous': {
    id: 'pattern-cover-dangerous',
    width: TILE_SIZE,
    height: TILE_SIZE,
    content: `
      <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${BG_COLOR}"/>
      ${COVER_RECTANGLES}
      <g>
        <line x1="24" y1="2" x2="30" y2="8" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="30" y1="2" x2="24" y2="8" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="2" y1="24" x2="8" y2="30" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="8" y1="24" x2="2" y2="30" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
      </g>
    `,
  },

  // Difficult + Dangerous: dense diagonals with multiple small X marks
  'difficult-dangerous': {
    id: 'pattern-difficult-dangerous',
    width: TILE_SIZE,
    height: TILE_SIZE,
    content: `
      <rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${BG_COLOR}"/>
      <g>
        <line x1="0" y1="8" x2="8" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="0" y1="16" x2="16" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="0" y1="24" x2="24" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="0" y1="32" x2="32" y2="0" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="8" y1="32" x2="32" y2="8" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="16" y1="32" x2="32" y2="16" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
        <line x1="24" y1="32" x2="32" y2="24" stroke="${STROKE_COLOR}" stroke-width="1.5" opacity="0.5"/>
      </g>
      <g>
        <line x1="12" y1="12" x2="20" y2="20" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="20" y1="12" x2="12" y2="20" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="2" y1="2" x2="8" y2="8" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="8" y1="2" x2="2" y2="8" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="24" y1="24" x2="30" y2="30" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
        <line x1="30" y1="24" x2="24" y2="30" stroke="${STROKE_COLOR}" stroke-width="1.8"/>
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
      <rect x="10" y="10" width="12" height="10" fill="#444" transform="rotate(12 16 15)"/>
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

/**
 * Get brief rule description for a terrain type (for legend).
 */
export function getTerrainRuleText(terrain: TerrainType): string {
  const rules: Record<TerrainType, string> = {
    open: 'No effect',
    blocking: 'Blocks LOS & movement',
    impassable: 'Blocks movement',
    cover: '+1 Defense',
    difficult: 'Max 3" move',
    dangerous: 'Roll for wounds',
    'cover-difficult': '+1 Def, max 3" move',
    'cover-dangerous': '+1 Def, roll wounds',
    'difficult-dangerous': 'Max 3", roll wounds',
    'cover-difficult-dangerous': '+1 Def, 3", wounds',
  };
  return rules[terrain];
}
