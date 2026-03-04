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

/** Minimum passage width between terrain (in hexes) - recommendation for large units */
export const MIN_PASSAGE_WIDTH_HEXES = 6;

/** Default minimum passage for blocking terrain (in hexes) */
export const DEFAULT_MIN_PASSAGE = 3;

// =============================================================================
// TERRAIN PIECE SIZES (in hexes)
// =============================================================================

/** Small scatter terrain: 6-12 hexes */
export const PIECE_SIZE_SMALL = { min: 6, max: 12 };

/** Medium terrain: 12-20 hexes */
export const PIECE_SIZE_MEDIUM = { min: 12, max: 20 };

/** Large terrain: 20-30 hexes */
export const PIECE_SIZE_LARGE = { min: 20, max: 30 };

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
// ELEVATION GENERATION TUNING
// =============================================================================

/**
 * Elevation cluster count formula: BASE + intensity * MULTIPLIER
 * At intensity 0: 3 clusters, at intensity 1: 11 clusters
 */
export const ELEVATION_CLUSTER_COUNT_BASE = 3;
export const ELEVATION_CLUSTER_COUNT_MULTIPLIER = 8;

/**
 * Elevation cluster size formula: BASE + intensity * MULTIPLIER
 * At intensity 0: 3 hexes, at intensity 1: 9 hexes
 */
export const ELEVATION_CLUSTER_SIZE_BASE = 3;
export const ELEVATION_CLUSTER_SIZE_MULTIPLIER = 6;

/**
 * Probability thresholds for elevation levels.
 * Roll < HIGH_ELEVATION: level 3-4 (10% chance)
 * Roll < MID_ELEVATION: level 2 (20% chance)
 * Roll < LOW_ELEVATION: level 1 (40% chance)
 * Otherwise: level -1 (30% chance)
 */
export const ELEVATION_PROB_HIGH = 0.1;
export const ELEVATION_PROB_MID = 0.3;
export const ELEVATION_PROB_LOW = 0.7;

/**
 * Scatter elevation formula: BASE + intensity * MULTIPLIER
 * Random single-hex elevation changes across the map
 */
export const ELEVATION_SCATTER_BASE = 0.02;
export const ELEVATION_SCATTER_MULTIPLIER = 0.05;

// =============================================================================
// GENERATOR DEFAULTS
// =============================================================================

/** Default terrain density (0-1 scale) */
export const DEFAULT_DENSITY = 0.5;

/** Default terrain mix percentages */
export const DEFAULT_TERRAIN_MIX = {
  blocking: 0.65, // Higher to help reach 50% blocking target
  impassable: 0, // Off by default
  cover: TARGET_COVER_MIN,
  difficult: TARGET_DIFFICULT_MIN,
  dangerous: 0.05, // Small amount by default
};

/** Default spread setting (0=clustered, 1=scattered) */
export const DEFAULT_SPREAD = 0.4;

/** Default symmetry setting */
export const DEFAULT_SYMMETRY = false;

/** Default LOS strictness (0=lenient/8-wide, 0.5=default/6-wide, 1=strict/4-wide) */
export const DEFAULT_LOS_STRICTNESS = 0.5;

/** Default edge buffer setting (keep terrain away from map edges) */
export const DEFAULT_EDGE_BUFFER = true;

/** Edge buffer size in hexes */
export const EDGE_BUFFER_SIZE = 2;

/** Default elevation settings */
export const DEFAULT_ELEVATION = {
  enabled: true,
  maxLevel: ELEVATION_DEFAULT_MAX,
  intensity: 0.5,
};

/** Default piece size (0=small, 0.5=medium, 1=large) */
export const DEFAULT_PIECE_SIZE = 0.5;

// =============================================================================
// GENERATOR TUNING
// =============================================================================

/** Maximum nudge iterations to reach compliance */
export const MAX_NUDGE_ITERATIONS = 25;

/** Maximum coverage before terrain removal kicks in */
export const MAX_COVERAGE_THRESHOLD = 0.3;

/** Blocking percentage target (slightly above 50% to avoid edge cases) */
export const BLOCKING_TARGET_LOW = 0.52;

/** Blocking percentage above which conversion to cover/difficult is allowed */
export const BLOCKING_TARGET_HIGH = 0.55;

/** Protection threshold for cover/difficult terrain during removal */
export const PROTECTION_THRESHOLD = 0.35;

/** Minimum dangerous terrain count to protect during removal */
export const MIN_DANGEROUS_PROTECT = 3;

/** Base number of terrain pieces at density 0 */
export const BASE_PIECES = 8;

/** Additional pieces per density unit */
export const PIECES_PER_DENSITY = 4;

/** Nudge piece size range */
export const NUDGE_PIECE_SIZE = { min: 6, max: 12 };

/** Forced piece size for large terrain variety */
export const FORCED_PIECE_SIZE = { min: 8, max: 14 };

/** Piece size slider thresholds */
export const PIECE_SIZE_THRESHOLD_SMALL = 0.33;
export const PIECE_SIZE_THRESHOLD_LARGE = 0.66;

/** Probability of scattered elevation being a rise vs depression */
export const SCATTER_RISE_PROBABILITY = 0.7;

// =============================================================================
// UI
// =============================================================================

/** Slider step for percentage controls */
export const SLIDER_STEP_PERCENT = 0.05;

/** Slider step for density control */
export const SLIDER_STEP_DENSITY = 0.1;
