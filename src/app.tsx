import { useState, useCallback } from 'preact/hooks';
import { MapCanvas } from './components/MapCanvas';
import { ControlPanel } from './components/ControlPanel';
import { generateSeed } from './lib/random';
import type { GeneratorConfig, DisplayConfig } from './types';

const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  columns: 36,
  rows: 24,
  seed: generateSeed(),
  density: 0.5,
  terrainMix: {
    blocking: 0.50,
    cover: 0.33,
    difficult: 0.33,
    dangerous: 0.10,
  },
  elevationEnabled: true,
  elevationRange: { min: -2, max: 3 },
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
    setGeneratorConfig(prev => ({
      ...prev,
      seed: generateSeed(),
    }));
  }, []);

  return (
    <div class="flex h-screen">
      <ControlPanel
        generatorConfig={generatorConfig}
        displayConfig={displayConfig}
        onGeneratorChange={setGeneratorConfig}
        onDisplayChange={setDisplayConfig}
        onRegenerate={handleRegenerate}
      />
      
      <main class="flex-1 p-4 flex items-center justify-center bg-gray-100 overflow-hidden">
        <div class="map-container bg-white shadow-xl rounded-lg p-2 w-full max-w-5xl aspect-[3/2]">
          <MapCanvas
            generatorConfig={generatorConfig}
            displayConfig={displayConfig}
          />
        </div>
      </main>
    </div>
  );
}
