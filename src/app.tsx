import { useState, useCallback } from 'preact/hooks';
import { MapCanvas } from './components/MapCanvas';
import { ControlPanel } from './components/ControlPanel';
import { generateSeed } from './lib/random';
import { GRID_COLUMNS, GRID_ROWS } from './lib/constants';
import { GENERATION_PRESETS } from './lib/presets';
import type { GeneratorConfig, DisplayConfig, GenerationPreset } from './types';

const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  columns: GRID_COLUMNS,
  rows: GRID_ROWS,
  seed: generateSeed(),
  theme: 'balanced',
  preset: 'balanced',
  density: 0.5,
  pieceSize: 0.5,
  terrainMix: {
    blocking: 0.5,
    cover: 0.33,
    difficult: 0.33,
    dangerous: 0.1,
  },
  elevationEnabled: true,
  elevationMax: 3,
  elevationIntensity: 0.5,
};

const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showCoordinates: false,
  showElevation: true,
  showContours: true,
  showTitle: false,
  title: 'Battle Map',
};

export function App() {
  const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>(DEFAULT_GENERATOR_CONFIG);
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(DEFAULT_DISPLAY_CONFIG);

  const handleGeneratorChange = useCallback((updates: Partial<GeneratorConfig>) => {
    setGeneratorConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      // If any slider value changed, switch to custom preset
      if (
        updates.density !== undefined ||
        updates.pieceSize !== undefined ||
        updates.terrainMix !== undefined
      ) {
        // Check if values still match current preset
        const presetValues = GENERATION_PRESETS[prev.preset];
        if (presetValues) {
          const mixChanged =
            updates.terrainMix &&
            (updates.terrainMix.blocking !== presetValues.terrainMix.blocking ||
              updates.terrainMix.cover !== presetValues.terrainMix.cover ||
              updates.terrainMix.difficult !== presetValues.terrainMix.difficult ||
              updates.terrainMix.dangerous !== presetValues.terrainMix.dangerous);
          const densityChanged =
            updates.density !== undefined && updates.density !== presetValues.density;
          const pieceSizeChanged =
            updates.pieceSize !== undefined && updates.pieceSize !== presetValues.pieceSize;

          if (mixChanged || densityChanged || pieceSizeChanged) {
            newConfig.preset = 'custom';
          }
        }
      }

      return newConfig;
    });
  }, []);

  const handlePresetChange = useCallback((preset: GenerationPreset) => {
    const presetValues = GENERATION_PRESETS[preset];
    if (presetValues) {
      setGeneratorConfig((prev) => ({
        ...prev,
        preset,
        density: presetValues.density,
        pieceSize: presetValues.pieceSize,
        terrainMix: { ...presetValues.terrainMix },
      }));
    } else {
      // Custom preset - just update the preset field
      setGeneratorConfig((prev) => ({ ...prev, preset }));
    }
  }, []);

  const handleRegenerate = useCallback(() => {
    setGeneratorConfig((prev) => ({
      ...prev,
      seed: generateSeed(),
    }));
  }, []);

  const handleSeedChange = useCallback((seed: string) => {
    setGeneratorConfig((prev) => ({
      ...prev,
      seed,
    }));
  }, []);

  return (
    <div class="flex h-screen">
      <ControlPanel
        generatorConfig={generatorConfig}
        displayConfig={displayConfig}
        onGeneratorChange={handleGeneratorChange}
        onPresetChange={handlePresetChange}
        onDisplayChange={setDisplayConfig}
        onSeedChange={handleSeedChange}
        onRegenerate={handleRegenerate}
      />

      <main class="flex-1 p-4 flex items-center justify-center bg-gray-100 overflow-hidden">
        <div class="map-container bg-white shadow-xl rounded-lg p-2 w-full max-w-5xl aspect-[3/2]">
          <MapCanvas generatorConfig={generatorConfig} displayConfig={displayConfig} />
        </div>
      </main>
    </div>
  );
}
