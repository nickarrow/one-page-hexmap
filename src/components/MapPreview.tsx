/**
 * MapPreview component - renders the hex grid as SVG.
 * This is the WYSIWYG print preview.
 *
 * Uses inline pattern rendering with clipPath instead of SVG <pattern> elements
 * to avoid Chrome's pattern rasterization that causes blurry prints.
 */

import React from 'react';
import type { HexGrid, DisplayConfig, TerrainType } from '../lib/types';
import { TERRAIN_PROPERTIES } from '../lib/types';
import { HEX_WIDTH_PX, HEX_HEIGHT_RATIO, GRID_WIDTH_PX, GRID_HEIGHT_PX } from '../lib/constants';
import { generatePatternDefs, getPatternDef } from '../lib/patterns';
import { hexCenter, hexPoints } from '../lib/hexUtils';
import { LegendOverlay } from './Legend';

interface MapPreviewProps {
  grid: HexGrid;
  seed: string;
  display: DisplayConfig;
}

// Padding around the hex grid
const PADDING = 8;

// Total SVG dimensions including padding
const SVG_WIDTH = GRID_WIDTH_PX + PADDING * 2;
const SVG_HEIGHT = GRID_HEIGHT_PX + PADDING * 2;

// Hex height for pattern calculations
const HEX_HEIGHT_PX = HEX_WIDTH_PX * HEX_HEIGHT_RATIO;

/**
 * Get the base fill color for a terrain type (no pattern).
 */
function getBaseFill(terrain: TerrainType): string {
  if (terrain === 'open') return '#ffffff';
  if (terrain === 'blocking') return '#1a1a1a';
  if (terrain === 'impassable') return '#e0e0e0';
  return '#ffffff';
}

/**
 * Render inline pattern elements for a hex, clipped to the hex shape.
 * This bypasses Chrome's SVG pattern rasterization for crisp prints.
 */
function InlineHexPattern({
  terrain,
  centerX,
  centerY,
  clipId,
}: {
  terrain: TerrainType;
  centerX: number;
  centerY: number;
  clipId: string;
}) {
  const def = getPatternDef(terrain);
  if (!def) return null;

  // Calculate bounding box for the hex (with some padding for safety)
  const left = centerX - HEX_WIDTH_PX / 2 - def.width;
  const top = centerY - HEX_HEIGHT_PX / 2 - def.height;
  const right = centerX + HEX_WIDTH_PX / 2 + def.width;
  const bottom = centerY + HEX_HEIGHT_PX / 2 + def.height;

  // Generate tiled pattern content
  const tiles: React.ReactElement[] = [];
  let tileIndex = 0;

  for (let x = left; x < right; x += def.width) {
    for (let y = top; y < bottom; y += def.height) {
      tiles.push(
        <g
          key={tileIndex++}
          transform={`translate(${x}, ${y})`}
          dangerouslySetInnerHTML={{ __html: def.content }}
        />
      );
    }
  }

  return <g clipPath={`url(#${clipId})`}>{tiles}</g>;
}

export function MapPreview({ grid, seed, display }: MapPreviewProps) {
  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="w-full h-full"
      style={{ backgroundColor: 'white' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Pattern definitions - kept for legend rendering */}
      <defs dangerouslySetInnerHTML={{ __html: generatePatternDefs() }} />

      {/* ClipPath definitions for each hex with a pattern */}
      <defs>
        {grid.map((column, col) =>
          column.map((hex, row) => {
            const terrain = hex.terrain;
            if (terrain === 'open' || terrain === 'blocking') return null;

            const center = hexCenter(col, row, HEX_WIDTH_PX);
            const points = hexPoints(center.x, center.y, HEX_WIDTH_PX);

            return (
              <clipPath key={`clip-${col}-${row}`} id={`clip-${col}-${row}`}>
                <polygon points={points} />
              </clipPath>
            );
          })
        )}
      </defs>

      {/* Background */}
      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="white" />

      {/* Optional border around the grid */}
      {display.showBorder && (
        <rect
          x={2}
          y={2}
          width={SVG_WIDTH - 4}
          height={SVG_HEIGHT - 4}
          fill="none"
          stroke="#ccc"
          strokeWidth="1"
        />
      )}

      {/* Hex grid - offset by padding */}
      <g transform={`translate(${PADDING}, ${PADDING})`}>
        {grid.map((column, col) =>
          column.map((hex, row) => {
            const center = hexCenter(col, row, HEX_WIDTH_PX);
            const points = hexPoints(center.x, center.y, HEX_WIDTH_PX);
            const props = TERRAIN_PROPERTIES[hex.terrain];
            const baseFill = getBaseFill(hex.terrain);
            const hasPattern = hex.terrain !== 'open' && hex.terrain !== 'blocking';

            const strokeColor = props.blocking ? '#000' : '#999';

            return (
              <g key={`${col}-${row}`}>
                {/* Hex base fill */}
                <polygon points={points} fill={baseFill} stroke={strokeColor} strokeWidth="0.5" />

                {/* Inline pattern (clipped to hex shape) */}
                {hasPattern && (
                  <InlineHexPattern
                    terrain={hex.terrain}
                    centerX={center.x}
                    centerY={center.y}
                    clipId={`clip-${col}-${row}`}
                  />
                )}

                {/* Hex outline (drawn again on top for crisp edges) */}
                {hasPattern && (
                  <polygon points={points} fill="none" stroke={strokeColor} strokeWidth="0.5" />
                )}

                {/* Elevation contour lines */}
                {hex.elevation !== 0 && !props.blocking && !props.impassable && (
                  <ElevationContours
                    centerX={center.x}
                    centerY={center.y}
                    hexWidth={HEX_WIDTH_PX}
                    elevation={hex.elevation}
                  />
                )}

                {/* Elevation label with background for readability */}
                {hex.elevation !== 0 && !props.blocking && !props.impassable && (
                  <g>
                    <rect
                      x={center.x - HEX_WIDTH_PX * 0.22}
                      y={center.y - HEX_WIDTH_PX * 0.18}
                      width={HEX_WIDTH_PX * 0.44}
                      height={HEX_WIDTH_PX * 0.34}
                      rx={2}
                      ry={2}
                      fill="white"
                    />
                    <text
                      x={center.x}
                      y={center.y + 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={HEX_WIDTH_PX * 0.32}
                      fontFamily="Arial, sans-serif"
                      fontWeight="bold"
                      fill="#333"
                    >
                      {hex.elevation > 0 ? `+${hex.elevation}` : hex.elevation}
                    </text>
                  </g>
                )}
              </g>
            );
          })
        )}
      </g>

      {/* Seed watermark */}
      {display.showSeed && (
        <text
          x={SVG_WIDTH - 6}
          y={SVG_HEIGHT - 6}
          textAnchor="end"
          fontSize="8"
          fontFamily="monospace"
          fill="#aaa"
        >
          Seed: {seed}
        </text>
      )}

      {/* Legend overlay - positioned on right or left side, vertically centered */}
      {display.legendMode === 'overlay-right' && (
        <g transform={`translate(${SVG_WIDTH - HEX_WIDTH_PX * 2.4 - 2}, 0)`}>
          <LegendOverlay grid={grid} svgHeight={SVG_HEIGHT} />
        </g>
      )}
      {display.legendMode === 'overlay-left' && (
        <g transform={`translate(2, 0)`}>
          <LegendOverlay grid={grid} svgHeight={SVG_HEIGHT} />
        </g>
      )}
    </svg>
  );
}

/**
 * Render elevation contour lines as concentric inner hexagons.
 * Positive elevation = solid lines
 * Negative elevation = dashed lines
 */
function ElevationContours({
  centerX,
  centerY,
  hexWidth,
  elevation,
}: {
  centerX: number;
  centerY: number;
  hexWidth: number;
  elevation: number;
}) {
  const hexHeight = hexWidth * HEX_HEIGHT_RATIO;
  const absElev = Math.abs(elevation);
  const isNegative = elevation < 0;

  const contours: React.ReactElement[] = [];

  // Draw concentric hexagons from outside in
  for (let i = 1; i <= absElev; i++) {
    // Scale from ~0.85 (outermost) down to ~0.35 (innermost)
    const scale = 0.85 - ((i - 1) / Math.max(absElev, 1)) * 0.5;
    const w = (hexWidth / 2) * scale;
    const h = (hexHeight / 2) * scale;

    // Generate hexagon points (flat-topped)
    const points = [
      [centerX + w, centerY], // Right
      [centerX + w / 2, centerY + h], // Bottom-right
      [centerX - w / 2, centerY + h], // Bottom-left
      [centerX - w, centerY], // Left
      [centerX - w / 2, centerY - h], // Top-left
      [centerX + w / 2, centerY - h], // Top-right
    ];

    const pathData =
      points
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(2)},${p[1].toFixed(2)}`)
        .join(' ') + ' Z';

    contours.push(
      <path
        key={i}
        d={pathData}
        fill="none"
        stroke="#666"
        strokeWidth="0.8"
        strokeDasharray={isNegative ? '3,2' : 'none'}
        opacity={0.5 + (i / absElev) * 0.3}
      />
    );
  }

  return <>{contours}</>;
}
