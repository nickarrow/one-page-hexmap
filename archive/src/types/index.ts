// Terrain property flags - simplified to boolean only
export interface TerrainProperties {
  cover: boolean;
  difficult: boolean;
  dangerous: boolean;
  impassable: boolean;
  blocking: boolean;
}

// Terrain type definition - property-based
export interface TerrainType {
  id: string;
  properties: TerrainProperties;
  patternId: string;
}

// Individual hex data
export interface HexData {
  q: number;
  r: number;
  n: string; // Display name for oi.hexmap.js (tooltip)
  terrain: string; // Terrain type ID
  elevation: number;
  class?: string; // CSS classes
}

// Generation preset - controls terrain mix defaults
export type GenerationPreset = 'balanced' | 'open' | 'dense' | 'hazardous' | 'custom';

// Generation configuration
export interface GeneratorConfig {
  columns: number;
  rows: number;
  seed: string;
  preset: GenerationPreset;
  density: number;
  pieceSize: number; // 0-1, controls terrain piece size (small to large)
  terrainMix: {
    blocking: number;
    cover: number;
    difficult: number;
    dangerous: number;
  };
  elevationEnabled: boolean;
  elevationMax: number; // +1 to +4
  elevationIntensity: number; // 0-1, how dramatic the elevation changes are
}

// Display options
export interface DisplayConfig {
  showCoordinates: boolean;
  showElevation: boolean;
  showContours: boolean;
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
