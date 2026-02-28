/**
 * Generation presets and terrain themes.
 *
 * - Themes control WHAT terrain types are available (filtering)
 * - Presets control HOW MUCH terrain (slider values)
 */

import type { GenerationPreset, TerrainTheme } from '../types';

// =============================================================================
// GENERATION PRESETS (how much terrain)
// =============================================================================

export interface PresetValues {
  density: number;
  pieceSize: number;
  terrainMix: {
    blocking: number;
    cover: number;
    difficult: number;
    dangerous: number;
  };
}

export const GENERATION_PRESETS: Record<GenerationPreset, PresetValues | null> = {
  balanced: {
    density: 0.5,
    pieceSize: 0.5,
    terrainMix: {
      blocking: 0.5,
      cover: 0.33,
      difficult: 0.33,
      dangerous: 0.1,
    },
  },
  open: {
    density: 0.3,
    pieceSize: 0.4,
    terrainMix: {
      blocking: 0.3,
      cover: 0.2,
      difficult: 0.2,
      dangerous: 0.05,
    },
  },
  dense: {
    density: 0.7,
    pieceSize: 0.6,
    terrainMix: {
      blocking: 0.6,
      cover: 0.5,
      difficult: 0.4,
      dangerous: 0.1,
    },
  },
  hazardous: {
    density: 0.5,
    pieceSize: 0.5,
    terrainMix: {
      blocking: 0.4,
      cover: 0.3,
      difficult: 0.3,
      dangerous: 0.3,
    },
  },
  custom: null, // No preset values - user controls sliders directly
};

export const PRESET_LABELS: Record<GenerationPreset, string> = {
  balanced: 'Balanced',
  open: 'Open Field',
  dense: 'Dense',
  hazardous: 'Hazardous',
  custom: 'Custom',
};

// =============================================================================
// TERRAIN THEMES (what terrain types)
// =============================================================================

/**
 * Terrain IDs allowed for each theme.
 * Themes filter the available terrain pool during generation.
 */
export const THEME_TERRAIN_IDS: Record<TerrainTheme, string[]> = {
  balanced: [
    'barricade',
    'building',
    'field',
    'forest',
    'hill',
    'waterShallow',
    'waterDeep',
    'lava',
    'mountain',
    'river',
    'rubble',
    'ruins',
    'swamp',
    'crater',
    'steepHill',
    'tower',
  ],
  urban: ['barricade', 'building', 'rubble', 'ruins', 'crater', 'tower'],
  wilderness: ['field', 'forest', 'hill', 'waterShallow', 'river', 'swamp', 'steepHill'],
  wasteland: ['crater', 'mountain', 'rubble', 'ruins', 'lava', 'barricade'],
  deathWorld: ['forest', 'steepHill', 'swamp', 'lava', 'waterDeep', 'mountain'],
};

export const THEME_LABELS: Record<TerrainTheme, string> = {
  balanced: 'Balanced',
  urban: 'Urban',
  wilderness: 'Wilderness',
  wasteland: 'Wasteland',
  deathWorld: 'Death World',
};

export const THEME_DESCRIPTIONS: Record<TerrainTheme, string> = {
  balanced: 'All terrain types',
  urban: 'Buildings, ruins, rubble',
  wilderness: 'Forests, hills, water',
  wasteland: 'Craters, rocks, ruins',
  deathWorld: 'Dense, dangerous terrain',
};
