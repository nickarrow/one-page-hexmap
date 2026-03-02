/**
 * Game and generation constants derived from OPR rulebook and PROJECT_FOUNDATION.md
 *
 * These values are based on:
 * - OPR half-scale rules (1 hex = 1 inch on a 36"×24" table)
 * - OPR terrain placement guidelines (rulebook lines 221-258)
 * - Physical constraints (7mm tokens, US Letter/A4 paper)
 */

// =============================================================================
// GRID DIMENSIONS
// =============================================================================

/** Standard grid width in hexes (36" half-scale table width) */
export const GRID_COLUMNS = 36;

/** Standard grid height in hexes (24" half-scale table height) */
export const GRID_ROWS = 24;

// =============================================================================
// OPR TERRAIN PLACEMENT RULES (rulebook lines 221-258)
// =============================================================================

/**
 * Terrain coverage targets as fraction of total hexes.
 * OPR recommends ~25% coverage; we allow 20-35% via density slider.
 */
export const TERRAIN_COVERAGE = {
  /** Minimum coverage at density=0 */
  MIN: 0.2,
  /** Additional coverage per density unit (so max = MIN + RANGE = 35%) */
  RANGE: 0.15,
} as const;

/**
 * Gap and passage constraints in hexes.
 *
 * IMPORTANT: These values are NOT halved for half-scale play.
 * While distances for movement/range are halved, physical unit bases remain
 * the same size. A gap that fits a 40mm base on a full table still needs to
 * fit that same 40mm base on a half table.
 */

/**
 * Maximum gap between terrain pieces in hexes.
 * OPR: "no gap larger than 12 inches" — keeps terrain distributed across table.
 */
export const MAX_TERRAIN_GAP_HEXES = 12;

/**
 * Minimum passage width between terrain pieces in hexes.
 * OPR: "gaps of at least 6 inches" — ensures units can move between terrain.
 * Currently validated by design (cluster placement naturally leaves gaps).
 * TODO: Add active enforcement if terrain gets too dense.
 */
export const MIN_PASSAGE_HEXES = 6;

/**
 * Minimum dangerous terrain pieces per OPR rules.
 * "Each player should pick 1 piece to be dangerous terrain" = 2 total.
 */
export const MIN_DANGEROUS_TERRAIN_PIECES = 2;

/**
 * Average cluster size used to estimate number of clusters from target hex count.
 * Based on typical terrain piece sizes in TERRAIN_PRESETS (2-8 hex range).
 */
export const AVERAGE_CLUSTER_SIZE = 5;

/**
 * Margin from map edges for terrain placement (in hexes).
 * Keeps terrain away from deployment zones and map borders.
 */
export const PLACEMENT_EDGE_MARGIN = 3;

// =============================================================================
// ELEVATION SYSTEM (per OPR climbing rules)
// =============================================================================

/**
 * OPR climbing rules: ±1 level is climbable, ±2+ is impassable.
 * Each level represents 2" of height.
 */
export const ELEVATION = {
  /** Number of ramp hexes to create around +2 elevation terrain */
  RAMP_HEXES_MIN: 2,
  RAMP_HEXES_MAX: 4,

  /** Number of climbable approach points for steep terrain */
  APPROACH_POINTS_MIN: 1,
  APPROACH_POINTS_MAX: 2,
} as const;

// =============================================================================
// TERRAIN GENERATION PROBABILITIES
// =============================================================================

/**
 * Probability settings for terrain feature generation.
 * These control variety without being configurable by users.
 */
export const GENERATION_CHANCES = {
  /** Chance for hill center to have +1 elevation peak */
  HILL_PEAK: 0.6,

  /** Chance for steep hill center to have +1 elevation peak */
  STEEP_HILL_PEAK: 0.5,

  /** Chance for ruins to have +1 elevation (partial walls) */
  RUINS_ELEVATION: 0.5,

  /** Chance for any open hex to get scattered elevation */
  SCATTERED_ELEVATION: 0.05,

  /** Of scattered elevation, chance to be a rise vs depression */
  SCATTERED_RISE_VS_DEPRESSION: 0.7,
} as const;

/**
 * Number of small elevated clusters to scatter across open terrain.
 */
export const SCATTERED_RISE_CLUSTERS = {
  MIN: 2,
  MAX: 4,
  /** Hexes per cluster */
  SIZE_MIN: 1,
  SIZE_MAX: 3,
} as const;

// =============================================================================
// ALGORITHM LIMITS
// =============================================================================

/**
 * Safety limits to prevent infinite loops or performance issues.
 */
export const ALGORITHM_LIMITS = {
  /** Max BFS iterations when measuring gaps (prevents runaway on large open areas) */
  GAP_SEARCH_MAX_HEXES: 100,

  /** Max attempts when growing a cluster (targetSize * this multiplier) */
  CLUSTER_GROWTH_MULTIPLIER: 10,

  /** Max adjacent hexes to add when filling gaps or fixing LOS */
  FILL_CLUSTER_MAX_ADJACENT: 2,

  /** Interval for vertical LOS checks (every N columns) */
  VERTICAL_LOS_CHECK_INTERVAL: 4,
} as const;

// =============================================================================
// GAP FILLING TERRAIN OPTIONS
// =============================================================================

/**
 * Terrain types used when filling large gaps or fixing LOS issues.
 * These provide cover without being impassable.
 */
export const GAP_FILL_TERRAIN_OPTIONS = ['forest', 'ruins', 'rubble', 'barricade'] as const;

/**
 * Default terrain for LOS blocking (partial LOS, common, natural-looking).
 */
export const LOS_BLOCKER_TERRAIN = 'forest';
