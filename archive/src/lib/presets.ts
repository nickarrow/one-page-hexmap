/**
 * Generation presets for property-based terrain system.
 *
 * Presets control HOW MUCH terrain of each type (slider values).
 * With property-based terrain, themes are no longer needed - the generator
 * picks terrain types based on the property mix percentages.
 */

import type { GenerationPreset } from '../types';

// =============================================================================
// GENERATION PRESETS
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

/**
 * OPR terrain recommendations:
 * - At least 50% should block line of sight
 * - At least 33% should provide cover
 * - At least 33% should be difficult terrain
 * - Each player should pick 1 piece to be dangerous (we use ~10% as default)
 */
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
