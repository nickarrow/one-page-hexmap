import type { GeneratorConfig, DisplayConfig } from '../types';

interface Props {
  generatorConfig: GeneratorConfig;
  displayConfig: DisplayConfig;
  onGeneratorChange: (config: GeneratorConfig) => void;
  onDisplayChange: (config: DisplayConfig) => void;
  onRegenerate: () => void;
}

export function ControlPanel({
  generatorConfig,
  displayConfig,
  onDisplayChange,
  onRegenerate,
}: Props) {
  return (
    <aside class="w-72 bg-white shadow-lg p-4 flex flex-col gap-4 overflow-y-auto control-panel">
      <h2 class="text-lg font-semibold text-gray-800">Map Controls</h2>
      
      {/* Seed display */}
      <div class="space-y-1">
        <label class="text-sm font-medium text-gray-600">Seed</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={generatorConfig.seed}
            readOnly
            class="flex-1 px-2 py-1 text-sm border rounded bg-gray-50 font-mono"
          />
          <button
            onClick={onRegenerate}
            class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            New
          </button>
        </div>
      </div>
      
      {/* Display toggles */}
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-gray-600">Display Options</h3>
        
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={displayConfig.showCoordinates}
            onChange={(e) => onDisplayChange({
              ...displayConfig,
              showCoordinates: (e.target as HTMLInputElement).checked,
            })}
            class="rounded"
          />
          <span class="text-sm">Show Coordinates</span>
        </label>
        
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={displayConfig.showElevation}
            onChange={(e) => onDisplayChange({
              ...displayConfig,
              showElevation: (e.target as HTMLInputElement).checked,
            })}
            class="rounded"
          />
          <span class="text-sm">Show Elevation</span>
        </label>
      </div>
      
      {/* Regenerate button */}
      <button
        onClick={onRegenerate}
        class="mt-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
      >
        Generate New Map
      </button>
      
      {/* Info */}
      <div class="text-xs text-gray-500 space-y-1">
        <p>36 × 24 hex grid</p>
        <p>1 hex = 1 inch (half-scale)</p>
        <p>Use half-distance OPR rules</p>
      </div>
    </aside>
  );
}
