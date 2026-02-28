import { useState, useCallback } from 'preact/hooks';
import { MapCanvas } from './components/MapCanvas';
import { ControlPanel } from './components/ControlPanel';
import { generateSeed } from './lib/random';
import { GRID_COLUMNS, GRID_ROWS } from './lib/constants';
import type { GeneratorConfig, DisplayConfig } from './types';

/**
 * Default terrain mix percentages per OPR guidelines:
 * - At least 50% should block/partially block LOS
 * - At least 33% should provide cover
 * - At least 33% should be difficult terrain
 * - Dangerous terrain generates ~2 pieces (1 per player)
 */
const DEFAULT_TERRAIN_MIX = {
  blocking: 0.5,
  cover: 0.33,
  difficult: 0.33,
  dangerous: 0.1,
} as const;

/** Elevation range: -2 (deep crater) to +3 (tall tower) */
const DEFAULT_ELEVATION_RANGE = { min: -2, max: 3 } as const;

const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  columns: GRID_COLUMNS,
  rows: GRID_ROWS,
  seed: generateSeed(),
  density: 0.5,
  terrainMix: { ...DEFAULT_TERRAIN_MIX },
  elevationEnabled: true,
  elevationRange: { ...DEFAULT_ELEVATION_RANGE },
};

const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showCoordinates: false,
  showElevation: true,
  showTitle: false,
  title: 'Battle Map',
};

export function App() {
  const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>(DEFAULT_GENERATOR_CONFIG);
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(DEFAULT_DISPLAY_CONFIG);

  const handleRegenerate = useCallback(() => {
    setGeneratorConfig((prev) => ({
      ...prev,
      seed: generateSeed(),
    }));
  }, []);

  return (
    <div class="flex h-screen">
      <ControlPanel
        generatorConfig={generatorConfig}
        displayConfig={displayConfig}
        onDisplayChange={setDisplayConfig}
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
