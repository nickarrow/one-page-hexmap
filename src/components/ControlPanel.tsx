import type { GeneratorConfig, DisplayConfig, GenerationPreset, TerrainTheme } from '../types';
import { PRESET_LABELS, THEME_LABELS, THEME_DESCRIPTIONS } from '../lib/presets';

interface Props {
  generatorConfig: GeneratorConfig;
  displayConfig: DisplayConfig;
  onGeneratorChange: (updates: Partial<GeneratorConfig>) => void;
  onPresetChange: (preset: GenerationPreset) => void;
  onDisplayChange: (config: DisplayConfig) => void;
  onSeedChange: (seed: string) => void;
  onRegenerate: () => void;
}

export function ControlPanel({
  generatorConfig,
  displayConfig,
  onGeneratorChange,
  onPresetChange,
  onDisplayChange,
  onSeedChange,
  onRegenerate,
}: Props) {
  const themes: TerrainTheme[] = ['balanced', 'urban', 'wilderness', 'wasteland', 'deathWorld'];
  const presets: GenerationPreset[] = ['balanced', 'open', 'dense', 'hazardous', 'custom'];

  return (
    <aside class="w-80 bg-white shadow-lg p-4 flex flex-col gap-4 overflow-y-auto control-panel">
      <h2 class="text-lg font-semibold text-gray-800">Map Generator</h2>

      {/* Seed */}
      <Section title="Seed">
        <div class="flex gap-2">
          <input
            type="text"
            value={generatorConfig.seed}
            onInput={(e) => onSeedChange((e.target as HTMLInputElement).value)}
            class="flex-1 px-2 py-1 text-sm border rounded font-mono"
            placeholder="Enter seed..."
          />
          <button
            onClick={onRegenerate}
            class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Random
          </button>
        </div>
      </Section>

      {/* Theme */}
      <Section title="Theme" subtitle="What terrain types appear">
        <select
          value={generatorConfig.theme}
          onChange={(e) => onGeneratorChange({ theme: (e.target as HTMLSelectElement).value as TerrainTheme })}
          class="w-full px-2 py-1.5 text-sm border rounded"
        >
          {themes.map((theme) => (
            <option key={theme} value={theme}>
              {THEME_LABELS[theme]} — {THEME_DESCRIPTIONS[theme]}
            </option>
          ))}
        </select>
      </Section>

      {/* Preset */}
      <Section title="Preset" subtitle="How much terrain">
        <select
          value={generatorConfig.preset}
          onChange={(e) => onPresetChange((e.target as HTMLSelectElement).value as GenerationPreset)}
          class="w-full px-2 py-1.5 text-sm border rounded"
        >
          {presets.map((preset) => (
            <option key={preset} value={preset}>
              {PRESET_LABELS[preset]}
            </option>
          ))}
        </select>
      </Section>

      {/* Terrain Mix Sliders */}
      <Section title="Terrain Mix">
        <Slider
          label="Density"
          value={generatorConfig.density}
          onChange={(v) => onGeneratorChange({ density: v })}
          min={0.1}
          max={0.8}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Piece Size"
          value={generatorConfig.pieceSize}
          onChange={(v) => onGeneratorChange({ pieceSize: v })}
          min={0.2}
          max={1}
          step={0.1}
          format={(v) => v < 0.4 ? 'Small' : v < 0.7 ? 'Medium' : 'Large'}
        />
        <Slider
          label="LOS Blocking"
          value={generatorConfig.terrainMix.blocking}
          onChange={(v) => onGeneratorChange({ 
            terrainMix: { ...generatorConfig.terrainMix, blocking: v } 
          })}
          min={0.1}
          max={0.8}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Cover"
          value={generatorConfig.terrainMix.cover}
          onChange={(v) => onGeneratorChange({ 
            terrainMix: { ...generatorConfig.terrainMix, cover: v } 
          })}
          min={0}
          max={0.6}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Difficult"
          value={generatorConfig.terrainMix.difficult}
          onChange={(v) => onGeneratorChange({ 
            terrainMix: { ...generatorConfig.terrainMix, difficult: v } 
          })}
          min={0}
          max={0.6}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Dangerous"
          value={generatorConfig.terrainMix.dangerous}
          onChange={(v) => onGeneratorChange({ 
            terrainMix: { ...generatorConfig.terrainMix, dangerous: v } 
          })}
          min={0}
          max={0.4}
          step={0.05}
          format={(v) => v === 0 ? 'None' : `${Math.round(v * 100)}%`}
        />
      </Section>

      {/* Elevation */}
      <Section title="Elevation">
        <Toggle
          label="Enable elevation"
          checked={generatorConfig.elevationEnabled}
          onChange={(checked) => onGeneratorChange({ elevationEnabled: checked })}
        />
        {generatorConfig.elevationEnabled && (
          <>
            <Slider
              label="Max Height"
              value={generatorConfig.elevationMax}
              onChange={(v) => onGeneratorChange({ elevationMax: v })}
              min={1}
              max={4}
              step={1}
              format={(v) => `+${v}`}
            />
            <Slider
              label="Intensity"
              value={generatorConfig.elevationIntensity}
              onChange={(v) => onGeneratorChange({ elevationIntensity: v })}
              min={0}
              max={1}
              step={0.1}
              format={(v) => v < 0.3 ? 'Low' : v < 0.7 ? 'Medium' : 'High'}
            />
          </>
        )}
      </Section>

      {/* Display Options */}
      <Section title="Display">
        <Toggle
          label="Show coordinates"
          checked={displayConfig.showCoordinates}
          onChange={(checked) => onDisplayChange({ ...displayConfig, showCoordinates: checked })}
        />
        <Toggle
          label="Show elevation labels"
          checked={displayConfig.showElevation}
          onChange={(checked) => onDisplayChange({ ...displayConfig, showElevation: checked })}
        />
      </Section>

      {/* Generate Button */}
      <button
        onClick={onRegenerate}
        class="mt-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
      >
        Generate New Map
      </button>

      {/* Info */}
      <div class="text-xs text-gray-500 space-y-1">
        <p>36 × 24 hex grid (half-scale OPR)</p>
        <p>1 hex = 1 inch</p>
      </div>
    </aside>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function Section({ 
  title, 
  subtitle, 
  children 
}: { 
  title: string; 
  subtitle?: string; 
  children: preact.ComponentChildren;
}) {
  return (
    <div class="space-y-2">
      <div>
        <h3 class="text-sm font-medium text-gray-700">{title}</h3>
        {subtitle && <p class="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}) {
  return (
    <div class="space-y-1">
      <div class="flex justify-between text-xs">
        <span class="text-gray-600">{label}</span>
        <span class="text-gray-800 font-medium">{format(value)}</span>
      </div>
      <input
        type="range"
        value={value}
        onInput={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        min={min}
        max={max}
        step={step}
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
        class="rounded text-blue-600"
      />
      <span class="text-sm text-gray-700">{label}</span>
    </label>
  );
}
