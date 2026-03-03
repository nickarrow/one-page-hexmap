/**
 * Legend component - renders terrain type legend.
 * Can be used as an overlay on the map or as a separate printable page.
 *
 * Uses inline pattern rendering with clipPath to avoid Chrome's pattern
 * rasterization that causes blurry prints.
 */

import React from 'react';
import type { TerrainType, HexGrid } from '../lib/types';
import { TERRAIN_PROPERTIES } from '../lib/types';
import { HEX_WIDTH_PX } from '../lib/constants';
import { getTerrainDisplayName, getTerrainRuleText, getPatternDef } from '../lib/patterns';
import { getUniqueTerrainTypes } from '../lib/hexUtils';

interface LegendProps {
  grid: HexGrid;
  mode: 'overlay' | 'separate';
}

const HEX_HEIGHT_RATIO = Math.sqrt(3) / 2;

/**
 * Generate hex polygon points for a given center and size.
 */
function legendHexPoints(cx: number, cy: number, size: number): string {
  const h = size * HEX_HEIGHT_RATIO;
  const w = size / 2;
  const points = [
    [cx + w, cy],
    [cx + w / 2, cy + h / 2],
    [cx - w / 2, cy + h / 2],
    [cx - w, cy],
    [cx - w / 2, cy - h / 2],
    [cx + w / 2, cy - h / 2],
  ];
  return points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

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
 * Render inline pattern elements for a legend hex, clipped to the hex shape.
 */
function InlineLegendPattern({
  terrain,
  cx,
  cy,
  size,
  clipId,
}: {
  terrain: TerrainType;
  cx: number;
  cy: number;
  size: number;
  clipId: string;
}) {
  const def = getPatternDef(terrain);
  if (!def) return null;

  const hexHeight = size * HEX_HEIGHT_RATIO;

  // Calculate bounding box for the hex
  const left = cx - size / 2 - def.width;
  const top = cy - hexHeight / 2 - def.height;
  const right = cx + size / 2 + def.width;
  const bottom = cy + hexHeight / 2 + def.height;

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

/**
 * Render a single hex sample with terrain pattern using inline rendering.
 */
function HexSample({
  terrain,
  cx,
  cy,
  size,
  clipId,
}: {
  terrain: TerrainType;
  cx: number;
  cy: number;
  size: number;
  clipId: string;
}) {
  const props = TERRAIN_PROPERTIES[terrain];
  const strokeColor = props.blocking ? '#000' : '#999';
  const baseFill = getBaseFill(terrain);
  const hasPattern = terrain !== 'open' && terrain !== 'blocking';
  const points = legendHexPoints(cx, cy, size);

  return (
    <g>
      {/* Hex base fill */}
      <polygon points={points} fill={baseFill} stroke={strokeColor} strokeWidth="0.5" />

      {/* Inline pattern (clipped to hex shape) */}
      {hasPattern && (
        <InlineLegendPattern terrain={terrain} cx={cx} cy={cy} size={size} clipId={clipId} />
      )}

      {/* Hex outline (drawn again on top for crisp edges) */}
      {hasPattern && <polygon points={points} fill="none" stroke={strokeColor} strokeWidth="0.5" />}
    </g>
  );
}

/**
 * Get display name for overlay, split into lines if needed.
 */
function getOverlayName(terrain: TerrainType): string[] {
  const names: Record<TerrainType, string[]> = {
    open: ['Open'],
    blocking: ['Blocking'],
    impassable: ['Impassable'],
    cover: ['Cover'],
    difficult: ['Difficult'],
    dangerous: ['Dangerous'],
    'cover-difficult': ['Cover +', 'Difficult'],
    'cover-dangerous': ['Cover +', 'Dangerous'],
    'difficult-dangerous': ['Difficult +', 'Dangerous'],
    'cover-difficult-dangerous': ['Cover + Diff', '+ Dangerous'],
  };
  return names[terrain];
}

/**
 * Get rule text for overlay.
 */
function getOverlayRule(terrain: TerrainType): string {
  const rules: Record<TerrainType, string> = {
    open: '',
    blocking: 'No LOS/move',
    impassable: 'No move',
    cover: '+1 Def',
    difficult: '3" max',
    dangerous: 'Wounds',
    'cover-difficult': '+1 Def, 3"',
    'cover-dangerous': '+1 Def, wounds',
    'difficult-dangerous': '3", wounds',
    'cover-difficult-dangerous': 'All effects',
  };
  return rules[terrain];
}

/**
 * Overlay legend - compact vertical list on right side of map.
 * Sized to fit within 3 hex widths with word wrapping.
 * Vertically centers itself based on svgHeight.
 */
export function LegendOverlay({ grid, svgHeight }: { grid: HexGrid; svgHeight: number }) {
  const terrainTypes = getUniqueTerrainTypes(grid);

  if (terrainTypes.length === 0) return null;

  // Use 2.6 hex widths to fit longer terrain names
  const width = HEX_WIDTH_PX * 2.6;

  const hexSize = HEX_WIDTH_PX * 0.85; // Large enough to show patterns clearly
  const hexHeight = hexSize * HEX_HEIGHT_RATIO;
  const padding = 4;
  const textOffset = hexSize / 2 + 4;
  const fontSize = HEX_WIDTH_PX * 0.24;
  const lineHeight = fontSize * 1.1;

  // Calculate row heights based on whether names wrap
  const rowHeights = terrainTypes.map((t) => {
    const lines = getOverlayName(t);
    const nameHeight = lines.length * lineHeight;
    const ruleHeight = fontSize * 0.75; // Smaller rule text
    return Math.max(hexHeight, nameHeight + ruleHeight) + 6;
  });

  const totalRowHeight = rowHeights.reduce((a, b) => a + b, 0);
  const height = padding * 2 + totalRowHeight + 14;

  // Center vertically within the SVG
  const yOffset = (svgHeight - height) / 2;

  // Calculate cumulative Y positions
  let cumulativeY = padding + 14;
  const yPositions = rowHeights.map((h) => {
    const y = cumulativeY + h / 2;
    cumulativeY += h;
    return y;
  });

  return (
    <g className="legend-overlay" transform={`translate(0, ${yOffset})`}>
      {/* ClipPath definitions for legend hex samples */}
      <defs>
        {terrainTypes.map((terrain, i) => {
          const y = yPositions[i];
          const hexCx = padding + hexSize / 2;
          const points = legendHexPoints(hexCx, y, hexSize);
          return (
            <clipPath key={`legend-clip-${terrain}`} id={`legend-clip-${terrain}`}>
              <polygon points={points} />
            </clipPath>
          );
        })}
      </defs>

      {/* Background with subtle border */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="white"
        fillOpacity={0.95}
        stroke="#999"
        strokeWidth="0.5"
        rx="2"
        ry="2"
      />

      {/* Title */}
      <text
        x={width / 2}
        y={padding + 6}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        fill="#333"
      >
        TERRAIN
      </text>

      {/* Legend entries */}
      {terrainTypes.map((terrain, i) => {
        const y = yPositions[i];
        const hexCx = padding + hexSize / 2;
        const nameLines = getOverlayName(terrain);
        const rule = getOverlayRule(terrain);

        // Calculate vertical offset for multi-line names
        const totalTextHeight = nameLines.length * lineHeight + (rule ? fontSize * 0.75 : 0);
        const textStartY = y - totalTextHeight / 2 + lineHeight * 0.7;

        return (
          <g key={terrain}>
            <HexSample
              terrain={terrain}
              cx={hexCx}
              cy={y}
              size={hexSize}
              clipId={`legend-clip-${terrain}`}
            />

            {/* Name (possibly multi-line) */}
            <text
              x={hexCx + textOffset}
              fontSize={fontSize}
              fontWeight="600"
              fontFamily="Arial, sans-serif"
              fill="#333"
            >
              {nameLines.map((line, lineIdx) => (
                <tspan key={lineIdx} x={hexCx + textOffset} y={textStartY + lineIdx * lineHeight}>
                  {line}
                </tspan>
              ))}
            </text>

            {/* Rule text */}
            {rule && (
              <text
                x={hexCx + textOffset}
                y={textStartY + nameLines.length * lineHeight}
                fontSize={fontSize * 0.75}
                fontFamily="Arial, sans-serif"
                fill="#666"
              >
                {rule}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Separate page legend - full page with more detail.
 * Designed to print as a second page.
 */
export function LegendPage({ grid, seed }: { grid: HexGrid; seed: string }) {
  const terrainTypes = getUniqueTerrainTypes(grid);

  // Page dimensions (US Letter landscape, same as map)
  const pageWidth = 1017.6;
  const pageHeight = 777.6;
  const margin = 40;

  const hexSize = 36;
  const hexHeight = hexSize * HEX_HEIGHT_RATIO;
  const rowHeight = Math.max(hexHeight + 12, 40);
  const colWidth = 320;

  // Arrange in 2 columns if many terrain types
  const useColumns = terrainTypes.length > 5;
  const itemsPerCol = useColumns ? Math.ceil(terrainTypes.length / 2) : terrainTypes.length;

  return (
    <svg
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      className="w-full h-full"
      style={{ backgroundColor: 'white' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* ClipPath definitions for legend hex samples */}
      <defs>
        {terrainTypes.map((terrain, i) => {
          const col = useColumns ? Math.floor(i / itemsPerCol) : 0;
          const row = useColumns ? i % itemsPerCol : i;
          const x = col * colWidth + margin + 60;
          const y = row * rowHeight + rowHeight / 2 + margin + 80;
          const hexCx = x + hexSize / 2;
          const points = legendHexPoints(hexCx, y, hexSize);
          return (
            <clipPath key={`page-clip-${terrain}`} id={`page-clip-${terrain}`}>
              <polygon points={points} />
            </clipPath>
          );
        })}
      </defs>

      {/* Background */}
      <rect width={pageWidth} height={pageHeight} fill="white" />

      {/* Title */}
      <text
        x={pageWidth / 2}
        y={margin + 20}
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        fill="#333"
      >
        Terrain Legend
      </text>

      <text
        x={pageWidth / 2}
        y={margin + 45}
        textAnchor="middle"
        fontSize="12"
        fontFamily="Arial, sans-serif"
        fill="#666"
      >
        OPR Hex Battle Map • Seed: {seed}
      </text>

      {/* Legend entries */}
      <g transform={`translate(${margin + 60}, ${margin + 80})`}>
        {terrainTypes.map((terrain, i) => {
          const col = useColumns ? Math.floor(i / itemsPerCol) : 0;
          const row = useColumns ? i % itemsPerCol : i;
          const x = col * colWidth;
          const y = row * rowHeight + rowHeight / 2;
          const hexCx = hexSize / 2;

          return (
            <g key={terrain} transform={`translate(${x}, ${y})`}>
              <HexSample
                terrain={terrain}
                cx={hexCx}
                cy={0}
                size={hexSize}
                clipId={`page-clip-${terrain}`}
              />
              <text
                x={hexCx + hexSize / 2 + 16}
                y={-6}
                fontSize="14"
                fontWeight="600"
                fontFamily="Arial, sans-serif"
                fill="#333"
              >
                {getTerrainDisplayName(terrain)}
              </text>
              <text
                x={hexCx + hexSize / 2 + 16}
                y={10}
                fontSize="11"
                fontFamily="Arial, sans-serif"
                fill="#666"
              >
                {getTerrainRuleText(terrain)}
              </text>
            </g>
          );
        })}
      </g>

      {/* Elevation legend if any elevation exists */}
      <g
        transform={`translate(${margin + 60}, ${margin + 80 + (itemsPerCol + 1) * rowHeight + 40})`}
      >
        <text
          x={0}
          y={0}
          fontSize="14"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
          fill="#333"
        >
          Elevation
        </text>
        <text x={0} y={20} fontSize="11" fontFamily="Arial, sans-serif" fill="#666">
          +N = raised (solid contours) • −N = lowered (dashed contours)
        </text>
        <text x={0} y={36} fontSize="11" fontFamily="Arial, sans-serif" fill="#666">
          ±1 level = climbable (extra movement) • ±2+ levels = impassable
        </text>
      </g>

      {/* Footer */}
      <text
        x={pageWidth / 2}
        y={pageHeight - margin}
        textAnchor="middle"
        fontSize="10"
        fontFamily="Arial, sans-serif"
        fill="#999"
      >
        Generated with OPR Hex Battle Map Generator
      </text>
    </svg>
  );
}

export function Legend({ mode }: LegendProps) {
  // Note: overlay mode is handled directly in MapPreview with LegendOverlay
  // This wrapper is kept for potential future use
  if (mode === 'overlay') {
    return null; // Overlay is rendered directly in MapPreview
  }
  // 'separate' mode is handled by LegendPage directly in App
  return null;
}
