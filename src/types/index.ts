// Terrain property flags
export interface TerrainProperties {
  cover: boolean;
  difficult: boolean | 'upward'; // true = always, 'upward' = only when moving up
  dangerous: boolean | 'rush-charge';
  impassable: boolean;
  blocking: boolean;
}

// LOS categories
export type LOSType = 'clear' | 'partial' | 'blocking';

// Terrain preset definition
export interface TerrainPreset {
  id: string;
  name: string;
  properties: TerrainProperties;
  losType: LOSType;
  baseElevation?: number;
  patternId: string;
  description: string;
  clusterSize: { min: number; max: number };
  shape: 'organic' | 'rectangular' | 'circular' | 'linear';
}

// Individual hex data
export interface HexData {
  q: number;
  r: number;
  n: string; // Display name for oi.hexmap.js
  terrain: string; // Preset ID
  elevation: number;
  class?: string; // CSS classes
}

// Generation configuration
export interface GeneratorConfig {
  columns: number;
  rows: number;
  seed: string;
  density: number;
  terrainMix: {
    blocking: number;
    cover: number;
    difficult: number;
    dangerous: number;
  };
  elevationEnabled: boolean;
  elevationRange: { min: number; max: number };
}

// Display options
export interface DisplayConfig {
  showCoordinates: boolean;
  showElevation: boolean;
  showTitle: boolean;
  title: string;
}

// HexJSON format (oi.hexmap.js)
export interface HexJSON {
  layout: 'odd-q' | 'even-q' | 'odd-r' | 'even-r';
  hexes: Record<string, HexData>;
}

// Map state combining generator and display configs
export interface MapState {
  generator: GeneratorConfig;
  display: DisplayConfig;
}
