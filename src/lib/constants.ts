/**
 * Constants for OPR Hex Battle Map Generator
 * All magic numbers live here with descriptive names.
 */

// =============================================================================
// GRID DIMENSIONS
// =============================================================================

/** Number of hex columns (horizontal) */
export const GRID_COLUMNS = 36;

/** Number of hex rows (vertical) */
export const GRID_ROWS = 24;

/** Total hexes in the grid */
export const TOTAL_HEXES = GRID_COLUMNS * GRID_ROWS;

// =============================================================================
// PRINT DIMENSIONS (US Letter Landscape)
// =============================================================================

/** Page width in inches */
export const PAGE_WIDTH_INCHES = 11;

/** Page height in inches */
export const PAGE_HEIGHT_INCHES = 8.5;

/** Print margin in inches */
export const PRINT_MARGIN_INCHES = 0.2;

/** Printable area width in inches */
export const PRINTABLE_WIDTH_INCHES = PAGE_WIDTH_INCHES - 2 * PRINT_MARGIN_INCHES;

/** Printable area height in inches */
export const PRINTABLE_HEIGHT_INCHES = PAGE_HEIGHT_INCHES - 2 * PRINT_MARGIN_INCHES;

/** DPI for SVG calculations */
export const DPI = 96;

/** Printable width in pixels */
export const PRINTABLE_WIDTH_PX = PRINTABLE_WIDTH_INCHES * DPI;

/** Printable height in pixels */
export const PRINTABLE_HEIGHT_PX = PRINTABLE_HEIGHT_INCHES * DPI;

// =============================================================================
// HEX GEOMETRY (Flat-topped hexes)
// =============================================================================

/**
 * For flat-topped hexes:
 * - Width (w) = distance between parallel flat edges
 * - Height (h) = distance between opposite points = w * 2/sqrt(3) = w * 1.1547
 * - Horizontal spacing = w * 3/4 (hexes interlock)
 * - Vertical spacing = h
 * - Odd columns offset down by h/2
 */

/** Ratio of hex height to width for flat-topped hexes: sqrt(3)/2 ≈ 0.866 */
export const HEX_HEIGHT_RATIO = Math.sqrt(3) / 2;

/** Horizontal spacing multiplier (hexes interlock at 3/4 width) */
export const HEX_HORIZONTAL_SPACING = 0.75;

/**
 * Calculate hex dimensions to fit grid in printable area.
 *
 * Grid width = hexWidth/2 + (GRID_COLUMNS - 1) * hexWidth * 0.75 + hexWidth/2
 *            = hexWidth * (1 + (GRID_COLUMNS - 1) * 0.75)
 *            = hexWidth * (0.25 + GRID_COLUMNS * 0.75)
 *
 * Grid height = hexHeight * GRID_ROWS + hexHeight/2 (for odd column offset)
 *             = hexHeight * (GRID_ROWS + 0.5)
 */

// Calculate based on width constraint to fill the page horizontally
const hexWidthFromWidth = PRINTABLE_WIDTH_PX / (0.25 + GRID_COLUMNS * HEX_HORIZONTAL_SPACING);

// Use width-based calculation
export const HEX_WIDTH_PX = hexWidthFromWidth;

/** Hex height in pixels */
export const HEX_HEIGHT_PX = HEX_WIDTH_PX * HEX_HEIGHT_RATIO;

/** Calculated grid width in pixels */
export const GRID_WIDTH_PX = HEX_WIDTH_PX * (0.25 + GRID_COLUMNS * HEX_HORIZONTAL_SPACING);

/** Calculated grid height in pixels */
export const GRID_HEIGHT_PX = HEX_HEIGHT_PX * (GRID_ROWS + 0.5);

// =============================================================================
// OPR TERRAIN GUIDELINES (Default targets)
// =============================================================================

/** Minimum percentage of map that should be covered with terrain */
export const TARGET_COVERAGE_MIN = 0.25;

/** Minimum percentage of terrain that should block LOS */
export const TARGET_BLOCKING_MIN = 0.5;

/** Minimum percentage of terrain that should provide cover */
export const TARGET_COVER_MIN = 0.33;

/** Minimum percentage of terrain that should be difficult */
export const TARGET_DIFFICULT_MIN = 0.33;

/** Default number of dangerous terrain clusters */
export const TARGET_DANGEROUS_CLUSTERS = 2;

/** Maximum gap between terrain pieces (in hexes) */
export const MAX_TERRAIN_GAP_HEXES = 12;

/** Minimum passage width between terrain (in hexes) */
export const MIN_PASSAGE_WIDTH_HEXES = 6;

// =============================================================================
// TERRAIN PIECE SIZES (in hexes)
// =============================================================================

/** Small scatter terrain: 1-3 hexes */
export const PIECE_SIZE_SMALL = { min: 1, max: 3 };

/** Medium terrain: 4-8 hexes */
export const PIECE_SIZE_MEDIUM = { min: 4, max: 8 };

/** Large terrain: 8-12 hexes */
export const PIECE_SIZE_LARGE = { min: 8, max: 12 };

// =============================================================================
// ELEVATION
// =============================================================================

/** Minimum elevation level */
export const ELEVATION_MIN = -2;

/** Maximum elevation level */
export const ELEVATION_MAX = 4;

/** Default maximum elevation when elevation is enabled */
export const ELEVATION_DEFAULT_MAX = 2;

/** Elevation change that is climbable (±1) */
export const CLIMBABLE_ELEVATION_DIFF = 1;

// =============================================================================
// GENERATOR DEFAULTS
// =============================================================================

/** Default terrain density (0-1 scale) */
export const DEFAULT_DENSITY = 0.5;

/** Default terrain mix percentages */
export const DEFAULT_TERRAIN_MIX = {
  blocking: TARGET_BLOCKING_MIN,
  impassable: 0, // Off by default
  cover: TARGET_COVER_MIN,
  difficult: TARGET_DIFFICULT_MIN,
  dangerous: 0.05, // Small amount by default
};

/** Default cluster spacing (0=tight, 1=spread) */
export const DEFAULT_CLUSTER_SPACING = 0.5;

/** Default symmetry setting */
export const DEFAULT_SYMMETRY = false;

/** Default strict LOS setting */
export const DEFAULT_STRICT_LOS = true;

/** Default elevation settings */
export const DEFAULT_ELEVATION = {
  enabled: true,
  maxLevel: ELEVATION_DEFAULT_MAX,
  intensity: 0.5,
};

// =============================================================================
// UI
// =============================================================================

/** Slider step for percentage controls */
export const SLIDER_STEP_PERCENT = 0.05;

/** Slider step for density control */
export const SLIDER_STEP_DENSITY = 0.1;
