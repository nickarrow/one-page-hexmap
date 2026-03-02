/**
 * Sidebar component - contains all controls.
 * Compact layout to fit without scrolling.
 */

import type { GeneratorConfig, DisplayConfig } from '../lib/types';
import {
  DEFAULT_DENSITY,
  DEFAULT_TERRAIN_MIX,
  DEFAULT_ELEVATION,
  DEFAULT_CLUSTER_SPACING,
  DEFAULT_SYMMETRY,
  DEFAULT_STRICT_LOS,
  DEFAULT_PIECE_SIZE,
  ELEVATION_MAX,
} from '../lib/constants';
import { generateSeed } from '../lib/random';

interface SidebarProps {
  config: GeneratorConfig;
  display: DisplayConfig;
  onConfigChange: (config: GeneratorConfig) => void;
  onDisplayChange: (display: DisplayConfig) => void;
  onRegenerate: () => void;
  onPrint: () => void;
  onShowStats: () => void;
}

export function Sidebar({
  config,
  display,
  onConfigChange,
  onDisplayChange,
  onRegenerate,
  onPrint,
  onShowStats,
}: SidebarProps) {
  const updateConfig = (updates: Partial<GeneratorConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const updateTerrainMix = (key: keyof GeneratorConfig['terrainMix'], value: number) => {
    onConfigChange({
      ...config,
      terrainMix: { ...config.terrainMix, [key]: value },
    });
  };

  const updateElevation = (key: keyof GeneratorConfig['elevation'], value: number | boolean) => {
    onConfigChange({
      ...config,
      elevation: { ...config.elevation, [key]: value },
    });
  };

  const randomizeSeed = () => {
    updateConfig({ seed: generateSeed() });
  };

  const resetToDefaults = () => {
    onConfigChange({
      ...config,
      density: DEFAULT_DENSITY,
      terrainMix: { ...DEFAULT_TERRAIN_MIX },
      pieceSize: DEFAULT_PIECE_SIZE,
      clusterSpacing: DEFAULT_CLUSTER_SPACING,
      symmetry: DEFAULT_SYMMETRY,
      strictLOS: DEFAULT_STRICT_LOS,
      elevation: { ...DEFAULT_ELEVATION },
    });
  };

  return (
    <aside className="w-64 h-screen bg-gray-50 border-r border-gray-200 p-3 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-lg font-bold text-gray-800">OPR Hex Map</h1>
        <p className="text-xs text-gray-500">Battle Map Generator</p>
      </div>

      {/* Seed Control */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1">Seed</label>
        <div className="flex gap-1">
          <input
            type="text"
            value={config.seed}
            onChange={(e) => updateConfig({ seed: e.target.value })}
            className="flex-1 px-2 py-1 border rounded text-xs font-mono"
            placeholder="Enter seed..."
          />
          <button
            onClick={randomizeSeed}
            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            title="Random seed"
          >
            🎲
          </button>
        </div>
      </div>

      {/* Terrain Density */}
      <CompactSlider
        label="Density"
        value={config.density}
        onChange={(v) => updateConfig({ density: v })}
        min={0}
        max={1}
        step={0.1}
        leftLabel="Sparse"
        rightLabel="Dense"
      />

      {/* Terrain Mix - 2 column grid */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1">Terrain Mix</label>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <MiniSlider
            label="Blocking"
            value={config.terrainMix.blocking}
            onChange={(v) => updateTerrainMix('blocking', v)}
          />
          <MiniSlider
            label="Impassable"
            value={config.terrainMix.impassable}
            onChange={(v) => updateTerrainMix('impassable', v)}
          />
          <MiniSlider
            label="Cover"
            value={config.terrainMix.cover}
            onChange={(v) => updateTerrainMix('cover', v)}
          />
          <MiniSlider
            label="Difficult"
            value={config.terrainMix.difficult}
            onChange={(v) => updateTerrainMix('difficult', v)}
          />
          <MiniSlider
            label="Dangerous"
            value={config.terrainMix.dangerous}
            onChange={(v) => updateTerrainMix('dangerous', v)}
          />
        </div>
      </div>

      {/* Piece Size */}
      <CompactSlider
        label="Piece Size"
        value={config.pieceSize}
        onChange={(v) => updateConfig({ pieceSize: v })}
        min={0}
        max={1}
        step={0.1}
        leftLabel="Small"
        rightLabel="Large"
      />

      {/* Cluster Spacing */}
      <CompactSlider
        label="Cluster Spacing"
        value={config.clusterSpacing}
        onChange={(v) => updateConfig({ clusterSpacing: v })}
        min={0}
        max={1}
        step={0.1}
        leftLabel="Tight"
        rightLabel="Spread"
      />

      {/* Generation Options */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1">Options</label>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.symmetry}
              onChange={(e) => updateConfig({ symmetry: e.target.checked })}
              className="rounded w-3 h-3"
            />
            <span className="text-xs text-gray-600">Symmetry (mirrored)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.strictLOS}
              onChange={(e) => updateConfig({ strictLOS: e.target.checked })}
              className="rounded w-3 h-3"
            />
            <span className="text-xs text-gray-600">Strict LOS blocking</span>
          </label>
        </div>
      </div>

      {/* Elevation */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-600">Elevation</label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={config.elevation.enabled}
              onChange={(e) => updateElevation('enabled', e.target.checked)}
              className="rounded w-3 h-3"
            />
            <span className="text-xs text-gray-500">On</span>
          </label>
        </div>

        {config.elevation.enabled && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <MiniSlider
              label={`Max: ${config.elevation.maxLevel}`}
              value={config.elevation.maxLevel}
              onChange={(v) => updateElevation('maxLevel', Math.round(v))}
              min={1}
              max={ELEVATION_MAX}
              step={1}
              showPercent={false}
            />
            <MiniSlider
              label="Intensity"
              value={config.elevation.intensity}
              onChange={(v) => updateElevation('intensity', v)}
            />
          </div>
        )}
      </div>

      {/* Display Options */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 block mb-1">Display</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={display.showBorder}
              onChange={(e) => onDisplayChange({ ...display, showBorder: e.target.checked })}
              className="rounded w-3 h-3"
            />
            <span className="text-xs text-gray-600">Border</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={display.showSeed}
              onChange={(e) => onDisplayChange({ ...display, showSeed: e.target.checked })}
              className="rounded w-3 h-3"
            />
            <span className="text-xs text-gray-600">Seed</span>
          </label>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            Generate
          </button>
          <button
            onClick={resetToDefaults}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            title="Reset to defaults"
          >
            ↺
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPrint}
            className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded text-sm font-medium"
          >
            Print / Save
          </button>
          <button
            onClick={onShowStats}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            title="View map statistics"
          >
            📊
          </button>
        </div>
      </div>
    </aside>
  );
}

function CompactSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  leftLabel,
  rightLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-[10px] text-gray-400 -mt-0.5">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

function MiniSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  showPercent = true,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showPercent?: boolean;
}) {
  const displayValue = showPercent ? `${Math.round(value * 100)}%` : '';

  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400">{displayValue}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1"
      />
    </div>
  );
}
