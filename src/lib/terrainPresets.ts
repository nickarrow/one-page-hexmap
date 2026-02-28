import type { TerrainPreset } from '../types';

/**
 * Terrain presets aligned with OPR rulebook guidelines (lines 199-211)
 * Each preset bundles the correct OPR properties together
 */
export const TERRAIN_PRESETS: Record<string, TerrainPreset> = {
  open: {
    id: 'open',
    name: 'Open',
    properties: {
      cover: false,
      difficult: false,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'none',
    description: 'No special rules',
    clusterSize: { min: 1, max: 1 },
    shape: 'organic',
  },
  
  // OPR: Barricades - Cover
  barricade: {
    id: 'barricade',
    name: 'Barricade',
    properties: {
      cover: true,
      difficult: false, // OPR says just Cover
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-barricade',
    description: 'Cover.',
    clusterSize: { min: 2, max: 3 },
    shape: 'linear',
  },
  
  // OPR: Buildings - Impassable + Blocking
  building: {
    id: 'building',
    name: 'Building',
    properties: {
      cover: false,
      difficult: false,
      dangerous: false,
      impassable: true,
      blocking: true,
    },
    losType: 'blocking',
    patternId: 'pattern-building',
    description: 'Impassable + Blocking.',
    clusterSize: { min: 2, max: 6 },
    shape: 'rectangular',
  },
  
  // Tower/Watchtower - Climbable elevated structure
  // Similar to hills but man-made, provides elevated firing position
  tower: {
    id: 'tower',
    name: 'Tower',
    properties: {
      cover: true,
      difficult: 'upward', // Difficult to climb up
      dangerous: false,
      impassable: false, // Can climb onto it
      blocking: false,
    },
    losType: 'partial',
    baseElevation: 2,
    patternId: 'pattern-tower',
    description: 'Cover + Difficult (upward). Elevated +2. LOS advantage.',
    clusterSize: { min: 1, max: 3 }, // Towers are small
    shape: 'rectangular',
  },
  
  // OPR: Fields - Difficult + Cover
  field: {
    id: 'field',
    name: 'Field',
    properties: {
      cover: true,
      difficult: true, // OPR says Difficult + Cover
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'partial',
    patternId: 'pattern-field',
    description: 'Difficult + Cover.',
    clusterSize: { min: 4, max: 8 },
    shape: 'rectangular',
  },
  
  // OPR: Forests - Difficult + Cover + Partial LOS
  forest: {
    id: 'forest',
    name: 'Forest',
    properties: {
      cover: true,
      difficult: true,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'partial',
    patternId: 'pattern-forest',
    description: 'Difficult + Cover. See into/out, not through.',
    clusterSize: { min: 4, max: 8 },
    shape: 'organic',
  },
  
  // OPR: Hills - Cover + Difficult when moving up + LOS advantage
  hill: {
    id: 'hill',
    name: 'Hill',
    properties: {
      cover: true,
      difficult: 'upward', // Difficult only when moving up
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'partial',
    baseElevation: 1,
    patternId: 'pattern-hill',
    description: 'Cover + Difficult (upward). LOS advantage.',
    clusterSize: { min: 4, max: 8 },
    shape: 'circular',
  },
  
  // OPR: Lakes (shallow) - Difficult
  waterShallow: {
    id: 'waterShallow',
    name: 'Shallow Water',
    properties: {
      cover: false,
      difficult: true,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-water-shallow',
    description: 'Difficult.',
    clusterSize: { min: 4, max: 10 },
    shape: 'organic',
  },
  
  // OPR: Lakes (deep) - Impassable
  waterDeep: {
    id: 'waterDeep',
    name: 'Deep Water',
    properties: {
      cover: false,
      difficult: false,
      dangerous: false,
      impassable: true,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-water-deep',
    description: 'Impassable.',
    clusterSize: { min: 4, max: 10 },
    shape: 'organic',
  },
  
  // OPR: Lava - Dangerous
  lava: {
    id: 'lava',
    name: 'Lava',
    properties: {
      cover: false,
      difficult: false,
      dangerous: true,
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-dangerous',
    description: 'Dangerous.',
    clusterSize: { min: 2, max: 4 },
    shape: 'organic',
  },
  
  // OPR: Mountains - Impassable + Blocking
  mountain: {
    id: 'mountain',
    name: 'Mountain',
    properties: {
      cover: false,
      difficult: false,
      dangerous: false,
      impassable: true,
      blocking: true,
    },
    losType: 'blocking',
    patternId: 'pattern-rocks',
    description: 'Impassable + Blocking.',
    clusterSize: { min: 2, max: 5 },
    shape: 'circular',
  },
  
  // OPR: Rivers - Dangerous when using rush/charge
  river: {
    id: 'river',
    name: 'River',
    properties: {
      cover: false,
      difficult: false,
      dangerous: 'rush-charge',
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-water-shallow',
    description: 'Dangerous on Rush/Charge.',
    clusterSize: { min: 3, max: 8 },
    shape: 'linear',
  },
  
  // OPR: Rubble - Difficult
  rubble: {
    id: 'rubble',
    name: 'Rubble',
    properties: {
      cover: false,
      difficult: true,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-rubble',
    description: 'Difficult.',
    clusterSize: { min: 2, max: 4 },
    shape: 'organic',
  },
  
  // OPR: Ruins - Cover + Dangerous when using rush/charge
  ruins: {
    id: 'ruins',
    name: 'Ruins',
    properties: {
      cover: true,
      difficult: false,
      dangerous: 'rush-charge',
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-ruins',
    description: 'Cover + Dangerous on Rush/Charge.',
    clusterSize: { min: 3, max: 6 },
    shape: 'rectangular',
  },
  
  // OPR: Swamps - Difficult (NOT dangerous per OPR)
  swamp: {
    id: 'swamp',
    name: 'Swamp',
    properties: {
      cover: false,
      difficult: true,
      dangerous: false, // OPR says just Difficult
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    patternId: 'pattern-swamp',
    description: 'Difficult.',
    clusterSize: { min: 4, max: 8 },
    shape: 'organic',
  },
  
  // Additional: Crater (depression with cover)
  crater: {
    id: 'crater',
    name: 'Crater',
    properties: {
      cover: true,
      difficult: false,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'clear',
    baseElevation: -1,
    patternId: 'pattern-crater',
    description: 'Cover. Depression.',
    clusterSize: { min: 2, max: 4 },
    shape: 'circular',
  },
  
  // Additional: Steep Hill (higher elevation)
  steepHill: {
    id: 'steepHill',
    name: 'Steep Hill',
    properties: {
      cover: true,
      difficult: 'upward',
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    losType: 'partial',
    baseElevation: 2,
    patternId: 'pattern-steep-hill',
    description: 'Cover + Difficult (upward). Elevation +2.',
    clusterSize: { min: 3, max: 6 },
    shape: 'circular',
  },
};

/**
 * Get terrain presets that provide blocking LOS
 */
export function getBlockingTerrains(): TerrainPreset[] {
  return Object.values(TERRAIN_PRESETS).filter(t => t.properties.blocking);
}

/**
 * Get terrain presets that provide cover
 */
export function getCoverTerrains(): TerrainPreset[] {
  return Object.values(TERRAIN_PRESETS).filter(t => t.properties.cover);
}

/**
 * Get terrain presets that are difficult
 */
export function getDifficultTerrains(): TerrainPreset[] {
  return Object.values(TERRAIN_PRESETS).filter(t => t.properties.difficult);
}

/**
 * Get terrain presets that are dangerous
 */
export function getDangerousTerrains(): TerrainPreset[] {
  return Object.values(TERRAIN_PRESETS).filter(t => t.properties.dangerous);
}

/**
 * Get all placeable terrain types (excluding open)
 */
export function getPlaceableTerrains(): TerrainPreset[] {
  return Object.values(TERRAIN_PRESETS).filter(t => t.id !== 'open');
}
