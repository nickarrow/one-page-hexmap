/**
 * Sidebar component - contains all controls.
 * Compact layout to fit without scrolling.
 */

import { useState, useRef, useEffect } from 'react';
import type { GeneratorConfig, DisplayConfig, LegendMode, HexGrid } from '../lib/types';
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
import { exportMap } from '../lib/export';

interface SidebarProps {
  config: GeneratorConfig;
  display: DisplayConfig;
  grid: HexGrid;
  onConfigChange: (config: GeneratorConfig) => void;
  onDisplayChange: (display: DisplayConfig) => void;
  onRegenerate: () => void;
  onPrint: () => void;
  onShowStats: () => void;
}

export function Sidebar({
  config,
  display,
  grid,
  onConfigChange,
  onDisplayChange,
  onRegenerate,
  onPrint,
  onShowStats,
}: SidebarProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: 'svg' | 'png') => {
    setExporting(true);
    setExportMenuOpen(false);
    try {
      await exportMap(grid, config.seed, display, format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

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
      <div className="mb-2">
        <h1 className="text-lg font-bold text-gray-800">OPR Hex Map</h1>
        <p className="text-xs text-gray-500">Battle Map Generator</p>
      </div>

      {/* Seed Control */}
      <div className="mb-2">
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
      <div className="mb-2">
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

      {/* Piece Size & Cluster Spacing - 2 column grid */}
      <div className="mb-2">
        <label className="text-xs font-semibold text-gray-600 block mb-1">Piece Layout</label>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <MiniSlider
            label="Size"
            value={config.pieceSize}
            onChange={(v) => updateConfig({ pieceSize: v })}
            showPercent={false}
          />
          <MiniSlider
            label="Spacing"
            value={config.clusterSpacing}
            onChange={(v) => updateConfig({ clusterSpacing: v })}
            showPercent={false}
          />
        </div>
      </div>

      {/* Generation Options */}
      <div className="mb-2">
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
      <div className="mb-2">
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
      <div className="mb-2">
        <label className="text-xs font-semibold text-gray-600 block mb-1">Display</label>
        <div className="flex gap-4 mb-1">
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

        {/* Legend Mode */}
        <div className="mt-1">
          <label className="text-[10px] text-gray-500 block mb-1">Legend</label>
          <select
            value={display.legendMode}
            onChange={(e) =>
              onDisplayChange({ ...display, legendMode: e.target.value as LegendMode })
            }
            className="w-full px-2 py-1 border rounded text-xs bg-white"
          >
            <option value="none">None</option>
            <option value="overlay-right">On Map (right)</option>
            <option value="overlay-left">On Map (left)</option>
            <option value="separate">Separate Page</option>
          </select>
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
            Print
          </button>
          <div className="relative flex-1" ref={exportMenuRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={exporting}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            {exportMenuOpen && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[140px]">
                <button
                  onClick={() => handleExport('svg')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 whitespace-nowrap"
                >
                  Export as SVG
                </button>
                <button
                  onClick={() => handleExport('png')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-t border-gray-100 whitespace-nowrap"
                >
                  Export as PNG
                </button>
              </div>
            )}
          </div>
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
    <div className="mb-2">
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
