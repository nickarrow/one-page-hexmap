/**
 * SVG pattern definitions for terrain types
 * 
 * DESIGN PRINCIPLES:
 * 1. Each pattern must be visually distinct at 7.5mm hex size
 * 2. Patterns should be thematically appropriate
 * 3. Simple shapes for clean printing
 * 4. Grayscale only for printer compatibility
 * 
 * VISUAL LANGUAGE:
 * - Circles = organic/natural (forest)
 * - Squares/rectangles = man-made debris (rubble)
 * - Solid fills = impassable (building, mountain)
 * - Curved arcs = elevation (hill, steep hill)
 * - Wavy lines = water
 * - Straight lines = crops/barriers
 * - X marks = hazard/danger
 * - Crosshatch = ruins/broken
 * - Dashed circles = depression (crater)
 */

const BASE_COLOR = '#ffffff';
const STROKE_COLOR = '#222222';

export const TERRAIN_PATTERNS: Record<string, string> = {
  
  // FOREST: Circles representing tree canopy from above
  // Distinct: Only terrain using large filled circles
  forest: `<pattern id="pattern-forest" patternUnits="userSpaceOnUse" width="56" height="56">
    <rect width="56" height="56" fill="${BASE_COLOR}"/>
    <circle cx="28" cy="28" r="16" fill="${STROKE_COLOR}" opacity="0.55"/>
    <circle cx="0" cy="0" r="10" fill="${STROKE_COLOR}" opacity="0.45"/>
    <circle cx="56" cy="0" r="10" fill="${STROKE_COLOR}" opacity="0.45"/>
    <circle cx="0" cy="56" r="10" fill="${STROKE_COLOR}" opacity="0.45"/>
    <circle cx="56" cy="56" r="10" fill="${STROKE_COLOR}" opacity="0.45"/>
  </pattern>`,
  
  // RUBBLE: Scattered squares/rectangles (angular debris)
  // Distinct: Only terrain using squares - contrasts with forest circles
  rubble: `<pattern id="pattern-rubble" patternUnits="userSpaceOnUse" width="50" height="50">
    <rect width="50" height="50" fill="${BASE_COLOR}"/>
    <rect x="8" y="10" width="12" height="10" fill="${STROKE_COLOR}" opacity="0.5" transform="rotate(15 14 15)"/>
    <rect x="30" y="28" width="10" height="8" fill="${STROKE_COLOR}" opacity="0.45" transform="rotate(-10 35 32)"/>
    <rect x="18" y="38" width="8" height="6" fill="${STROKE_COLOR}" opacity="0.4" transform="rotate(25 22 41)"/>
    <rect x="38" y="8" width="7" height="9" fill="${STROKE_COLOR}" opacity="0.4" transform="rotate(-20 41 12)"/>
  </pattern>`,
  
  // RUINS: Broken crosshatch (crumbling walls)
  // Distinct: Only terrain with X pattern / crosshatch
  ruins: `<pattern id="pattern-ruins" patternUnits="userSpaceOnUse" width="44" height="44">
    <rect width="44" height="44" fill="${BASE_COLOR}"/>
    <line x1="0" y1="0" x2="44" y2="44" stroke="${STROKE_COLOR}" stroke-width="5" opacity="0.5"/>
    <line x1="44" y1="0" x2="0" y2="44" stroke="${STROKE_COLOR}" stroke-width="5" opacity="0.5"/>
  </pattern>`,
  
  // BUILDING: Solid dark fill (impassable structure)
  // Distinct: Solid fill, darkest shade
  building: `<pattern id="pattern-building" patternUnits="userSpaceOnUse" width="10" height="10">
    <rect width="10" height="10" fill="#1a1a1a"/>
  </pattern>`,
  
  // TOWER: Grid/brick pattern (climbable elevated structure)
  // Distinct: Grid lines on lighter background - accessible unlike solid building
  tower: `<pattern id="pattern-tower" patternUnits="userSpaceOnUse" width="40" height="40">
    <rect width="40" height="40" fill="#e0e0e0"/>
    <line x1="0" y1="20" x2="40" y2="20" stroke="${STROKE_COLOR}" stroke-width="2" opacity="0.5"/>
    <line x1="20" y1="0" x2="20" y2="20" stroke="${STROKE_COLOR}" stroke-width="2" opacity="0.5"/>
    <line x1="0" y1="20" x2="0" y2="40" stroke="${STROKE_COLOR}" stroke-width="2" opacity="0.5"/>
    <line x1="40" y1="20" x2="40" y2="40" stroke="${STROKE_COLOR}" stroke-width="2" opacity="0.5"/>
  </pattern>`,
  
  // MOUNTAIN: Solid dark fill (impassable, slightly lighter than building)
  // Distinct: Solid fill with subtle texture
  rocks: `<pattern id="pattern-rocks" patternUnits="userSpaceOnUse" width="20" height="20">
    <rect width="20" height="20" fill="#2d2d2d"/>
    <polygon points="10,2 18,18 2,18" fill="#222" opacity="0.3"/>
  </pattern>`,
  
  // HILL: Curved contour arcs (elevation lines)
  // Distinct: Single curved arc, open at bottom
  hill: `<pattern id="pattern-hill" patternUnits="userSpaceOnUse" width="70" height="50">
    <rect width="70" height="50" fill="${BASE_COLOR}"/>
    <path d="M5,42 Q35,8 65,42" stroke="${STROKE_COLOR}" stroke-width="5" fill="none" opacity="0.5"/>
  </pattern>`,
  
  // STEEP HILL: Multiple contour arcs (higher elevation)
  // Distinct: Multiple nested arcs vs single arc for regular hill
  steepHill: `<pattern id="pattern-steep-hill" patternUnits="userSpaceOnUse" width="70" height="55">
    <rect width="70" height="55" fill="${BASE_COLOR}"/>
    <path d="M5,48 Q35,15 65,48" stroke="${STROKE_COLOR}" stroke-width="5" fill="none" opacity="0.5"/>
    <path d="M12,32 Q35,8 58,32" stroke="${STROKE_COLOR}" stroke-width="4" fill="none" opacity="0.4"/>
  </pattern>`,
  
  // FIELD: Diagonal lines (crop rows at angle)
  // Distinct: Diagonal vs vertical/horizontal lines
  field: `<pattern id="pattern-field" patternUnits="userSpaceOnUse" width="28" height="28">
    <rect width="28" height="28" fill="${BASE_COLOR}"/>
    <line x1="0" y1="28" x2="28" y2="0" stroke="${STROKE_COLOR}" stroke-width="4" opacity="0.4"/>
  </pattern>`,
  
  // BARRICADE: Short horizontal dashes (barrier segments)
  // Distinct: Horizontal dashes vs diagonal field lines
  barricade: `<pattern id="pattern-barricade" patternUnits="userSpaceOnUse" width="40" height="30">
    <rect width="40" height="30" fill="${BASE_COLOR}"/>
    <line x1="5" y1="15" x2="35" y2="15" stroke="${STROKE_COLOR}" stroke-width="8" opacity="0.5" stroke-linecap="round"/>
  </pattern>`,
  
  // SHALLOW WATER: Horizontal wavy lines
  // Distinct: Wavy horizontal lines (water movement)
  waterShallow: `<pattern id="pattern-water-shallow" patternUnits="userSpaceOnUse" width="60" height="35">
    <rect width="60" height="35" fill="${BASE_COLOR}"/>
    <path d="M0,17 Q15,7 30,17 T60,17" stroke="${STROKE_COLOR}" stroke-width="4" fill="none" opacity="0.45"/>
  </pattern>`,
  
  // DEEP WATER: Dense wavy lines with gray background
  // Distinct: Gray background + wavy lines (deeper = darker)
  waterDeep: `<pattern id="pattern-water-deep" patternUnits="userSpaceOnUse" width="50" height="26">
    <rect width="50" height="26" fill="#d0d0d0"/>
    <path d="M0,13 Q12,4 25,13 T50,13" stroke="${STROKE_COLOR}" stroke-width="4" fill="none" opacity="0.55"/>
  </pattern>`,
  
  // SWAMP: Horizontal straight lines with dots (murky water + vegetation)
  // Distinct: Straight lines (not wavy) + dots - different from water
  swamp: `<pattern id="pattern-swamp" patternUnits="userSpaceOnUse" width="55" height="40">
    <rect width="55" height="40" fill="${BASE_COLOR}"/>
    <line x1="0" y1="28" x2="55" y2="28" stroke="${STROKE_COLOR}" stroke-width="3" opacity="0.35"/>
    <circle cx="15" cy="12" r="5" fill="${STROKE_COLOR}" opacity="0.4"/>
    <circle cx="42" cy="18" r="4" fill="${STROKE_COLOR}" opacity="0.35"/>
    <circle cx="30" cy="8" r="3" fill="${STROKE_COLOR}" opacity="0.3"/>
  </pattern>`,
  
  // CRATER: Concentric dashed circles (impact depression)
  // Distinct: Only terrain with circular dashed lines
  crater: `<pattern id="pattern-crater" patternUnits="userSpaceOnUse" width="70" height="70">
    <rect width="70" height="70" fill="${BASE_COLOR}"/>
    <circle cx="35" cy="35" r="26" stroke="${STROKE_COLOR}" stroke-width="4" fill="none" opacity="0.45" stroke-dasharray="8 5"/>
    <circle cx="35" cy="35" r="12" stroke="${STROKE_COLOR}" stroke-width="3" fill="none" opacity="0.35"/>
  </pattern>`,
  
  // LAVA/DANGEROUS: X marks (universal hazard symbol)
  // Distinct: Bold X pattern - clear danger indication
  dangerous: `<pattern id="pattern-dangerous" patternUnits="userSpaceOnUse" width="45" height="45">
    <rect width="45" height="45" fill="${BASE_COLOR}"/>
    <line x1="8" y1="8" x2="37" y2="37" stroke="${STROKE_COLOR}" stroke-width="6" opacity="0.6"/>
    <line x1="37" y1="8" x2="8" y2="37" stroke="${STROKE_COLOR}" stroke-width="6" opacity="0.6"/>
  </pattern>`,
};

/**
 * Get all pattern definitions as an array for oi.hexmap.js
 */
export function getAllPatterns(): string[] {
  return Object.values(TERRAIN_PATTERNS);
}

/**
 * Get the fill value for a terrain type
 */
export function getTerrainFill(terrainId: string): string {
  if (terrainId === 'open') {
    return BASE_COLOR;
  }
  if (TERRAIN_PATTERNS[terrainId]) {
    return `url(#pattern-${terrainId})`;
  }
  return BASE_COLOR;
}
