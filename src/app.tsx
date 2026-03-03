/**
 * Main App component - layout and state management.
 */

import { useState, useEffect, useCallback } from 'react';
import type { GeneratorConfig, DisplayConfig, HexGrid } from './lib/types';
import { generateMap } from './lib/generator';
import { calculateMapStats } from './lib/stats';
import { generateSeed } from './lib/random';
import {
  DEFAULT_DENSITY,
  DEFAULT_TERRAIN_MIX,
  DEFAULT_ELEVATION,
  DEFAULT_CLUSTER_SPACING,
  DEFAULT_SYMMETRY,
  DEFAULT_STRICT_LOS,
  DEFAULT_PIECE_SIZE,
} from './lib/constants';
import { Sidebar } from './components/Sidebar';
import { MapPreview } from './components/MapPreview';
import { StatsModal } from './components/StatsModal';
import { LegendPage } from './components/Legend';

// Initial configuration
const initialConfig: GeneratorConfig = {
  seed: generateSeed(),
  density: DEFAULT_DENSITY,
  terrainMix: { ...DEFAULT_TERRAIN_MIX },
  pieceSize: DEFAULT_PIECE_SIZE,
  clusterSpacing: DEFAULT_CLUSTER_SPACING,
  symmetry: DEFAULT_SYMMETRY,
  strictLOS: DEFAULT_STRICT_LOS,
  elevation: { ...DEFAULT_ELEVATION },
};

const initialDisplay: DisplayConfig = {
  showBorder: true,
  showSeed: true,
  legendMode: 'none',
};

export function App() {
  const [config, setConfig] = useState<GeneratorConfig>(initialConfig);
  const [display, setDisplay] = useState<DisplayConfig>(initialDisplay);
  const [grid, setGrid] = useState<HexGrid>(() => generateMap(initialConfig));
  const [showStats, setShowStats] = useState(false);

  // Calculate stats whenever grid changes
  const stats = calculateMapStats(grid);

  // Regenerate map when config changes
  const regenerate = useCallback(() => {
    const newGrid = generateMap(config);
    setGrid(newGrid);
  }, [config]);

  // Auto-regenerate when seed changes
  useEffect(() => {
    regenerate();
  }, [config.seed]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-screen flex overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Sidebar - hidden when printing */}
      <div className="print:hidden flex-shrink-0">
        <Sidebar
          config={config}
          display={display}
          onConfigChange={setConfig}
          onDisplayChange={setDisplay}
          onRegenerate={regenerate}
          onPrint={handlePrint}
          onShowStats={() => setShowStats(true)}
        />
      </div>

      {/* Main content - map preview */}
      <main className="flex-1 bg-gray-200 p-4 print:p-0 print:bg-white flex items-center justify-center overflow-hidden print:block print:overflow-visible">
        <div className="w-full h-full flex items-center justify-center print:block print:w-auto print:h-auto">
          <div
            className="bg-white shadow-lg print:shadow-none max-w-full max-h-full print:max-w-none print:max-h-none print:w-full print:h-full"
            style={{
              aspectRatio: '11 / 8.5',
              width: 'min(100%, calc((100vh - 2rem) * 11 / 8.5))',
              height: 'auto',
            }}
          >
            <MapPreview grid={grid} seed={config.seed} display={display} />
          </div>
        </div>
      </main>

      {/* Stats Modal */}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}

      {/* Separate Legend Page - only visible when printing in 'separate' mode */}
      {display.legendMode === 'separate' && (
        <div className="legend-page hidden print:block">
          <LegendPage grid={grid} seed={config.seed} />
        </div>
      )}
    </div>
  );
}
