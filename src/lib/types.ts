/**
 * Type definitions for OPR Hex Battle Map Generator
 */

// =============================================================================
// TERRAIN PROPERTIES
// =============================================================================

/**
 * The fundamental terrain properties from OPR rules.
 * A hex can have any combination of these (except blocking/impassable are exclusive).
 */
export interface TerrainProperties {
  /** Blocks line of sight AND movement (buildings, mountains) */
  blocking: boolean;
  /** Blocks movement but NOT line of sight (deep water, chasms) */
  impassable: boolean;
  /** Provides +1 Defense (ruins, barricades) */
  cover: boolean;
  /** Limits movement to 6" / 3 hexes (mud, forests) */
  difficult: boolean;
  /** Roll for wounds when entering/activating (lava, minefields) */
  dangerous: boolean;
}

/**
 * The 10 terrain types we support, defined by their property combinations.
 */
export type TerrainType =
  | 'open'
  | 'blocking'
  | 'impassable'
  | 'cover'
  | 'difficult'
  | 'dangerous'
  | 'cover-difficult'
  | 'cover-dangerous'
  | 'difficult-dangerous'
  | 'cover-difficult-dangerous';

/**
 * Map terrain type to its properties
 */
export const TERRAIN_PROPERTIES: Record<TerrainType, TerrainProperties> = {
  open: {
    blocking: false,
    impassable: false,
    cover: false,
    difficult: false,
    dangerous: false,
  },
  blocking: {
    blocking: true,
    impassable: true, // Blocking implies impassable
    cover: false,
    difficult: false,
    dangerous: false,
  },
  impassable: {
    blocking: false,
    impassable: true,
    cover: false,
    difficult: false,
    dangerous: false,
  },
  cover: {
    blocking: false,
    impassable: false,
    cover: true,
    difficult: false,
    dangerous: false,
  },
  difficult: {
    blocking: false,
    impassable: false,
    cover: false,
    difficult: true,
    dangerous: false,
  },
  dangerous: {
    blocking: false,
    impassable: false,
    cover: false,
    difficult: false,
    dangerous: true,
  },
  'cover-difficult': {
    blocking: false,
    impassable: false,
    cover: true,
    difficult: true,
    dangerous: false,
  },
  'cover-dangerous': {
    blocking: false,
    impassable: false,
    cover: true,
    difficult: false,
    dangerous: true,
  },
  'difficult-dangerous': {
    blocking: false,
    impassable: false,
    cover: false,
    difficult: true,
    dangerous: true,
  },
  'cover-difficult-dangerous': {
    blocking: false,
    impassable: false,
    cover: true,
    difficult: true,
    dangerous: true,
  },
};

// =============================================================================
// HEX DATA
// =============================================================================

/**
 * Data for a single hex in the grid.
 */
export interface HexData {
  /** Column index (0-35) */
  col: number;
  /** Row index (0-23) */
  row: number;
  /** Terrain type */
  terrain: TerrainType;
  /** Elevation level (-2 to +4, 0 = ground level) */
  elevation: number;
}

/**
 * The complete hex grid.
 */
export type HexGrid = HexData[][];

// =============================================================================
// GENERATOR CONFIG
// =============================================================================

/**
 * Configuration for the map generator.
 */
export interface GeneratorConfig {
  /** Random seed for reproducibility */
  seed: string;
  /** Overall terrain density (0-1) */
  density: number;
  /** Terrain mix targets (0-1 each) */
  terrainMix: {
    blocking: number;
    impassable: number;
    cover: number;
    difficult: number;
    dangerous: number;
  };
  /** Piece size preference (0=small, 0.5=medium, 1=large) */
  pieceSize: number;
  /** Cluster spacing (0=tight clusters, 1=spread out) */
  clusterSpacing: number;
  /** Mirror terrain for competitive balance */
  symmetry: boolean;
  /** Strict LOS blocking (all 3 columns vs any 2) */
  strictLOS: boolean;
  /** Elevation settings */
  elevation: {
    enabled: boolean;
    maxLevel: number;
    intensity: number;
  };
}

// =============================================================================
// MAP STATISTICS
// =============================================================================

/**
 * Statistics about a generated map for OPR guideline compliance.
 */
export interface MapStats {
  /** Percentage of hexes with terrain (vs open) */
  coverage: number;
  /** Percentage of terrain hexes that block LOS */
  blockingPercent: number;
  /** Percentage of terrain hexes that are impassable (but don't block LOS) */
  impassablePercent: number;
  /** Percentage of terrain hexes that provide cover */
  coverPercent: number;
  /** Percentage of terrain hexes that are difficult */
  difficultPercent: number;
  /** Number of dangerous terrain hexes */
  dangerousCount: number;
  /** Whether edge-to-edge LOS is blocked */
  losBlocked: boolean;
  /** Maximum gap between terrain pieces (in hexes) */
  maxGap: number;
  /** Minimum passage width between terrain (in hexes) */
  minPassage: number;
  /** Balance stats: terrain distribution top vs bottom */
  balance: {
    topTerrain: number;
    bottomTerrain: number;
    topBlocking: number;
    bottomBlocking: number;
    topCover: number;
    bottomCover: number;
  };
}

// =============================================================================
// DISPLAY CONFIG
// =============================================================================

/**
 * Display options for the map preview.
 */
export interface DisplayConfig {
  /** Show border around map */
  showBorder: boolean;
  /** Show seed watermark */
  showSeed: boolean;
}
