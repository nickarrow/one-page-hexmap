/**
 * Print4x component - renders 4 quadrant pages for large-format printing.
 * Each quadrant is a full US Letter page showing 1/4 of the map at 2x scale.
 */

import React from 'react';
import type { HexGrid, DisplayConfig, TerrainType } from '../lib/types';
import { TERRAIN_PROPERTIES } from '../lib/types';
import { HEX_WIDTH_PX, HEX_HEIGHT_RATIO, GRID_WIDTH_PX, GRID_HEIGHT_PX } from '../lib/constants';
import { generatePatternDefs, getPatternDef } from '../lib/patterns';
import { hexCenter, hexPoints } from '../lib/hexUtils';

// Same padding as MapPreview
const PADDING = 19;
const SVG_WIDTH = GRID_WIDTH_PX + PADDING * 2;
const SVG_HEIGHT = GRID_HEIGHT_PX + PADDING * 2;
const HEX_HEIGHT_PX = HEX_WIDTH_PX * HEX_HEIGHT_RATIO;

// Quadrant dimensions (half of full SVG)
const QUADRANT_WIDTH = SVG_WIDTH / 2;
const QUADRANT_HEIGHT = SVG_HEIGHT / 2;

// Alignment mark size
const MARK_SIZE = 12;

interface Print4xPagesProps {
  grid: HexGrid;
  seed: string;
  display: DisplayConfig;
}

type Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function getBaseFill(terrain: TerrainType): string {
  if (terrain === 'open') return '#ffffff';
  if (terrain === 'blocking') return '#1a1a1a';
  if (terrain === 'impassable') return '#e0e0e0';
  return '#ffffff';
}

/**
 * Render inline pattern elements for a hex, clipped to the hex shape.
 * Coordinates include PADDING to match clipPath in SVG root space.
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

  // Add PADDING since clipPath is in SVG root coordinates
  const cx = centerX + PADDING;
  const cy = centerY + PADDING;

  const left = cx - HEX_WIDTH_PX / 2 - def.width;
  const top = cy - HEX_HEIGHT_PX / 2 - def.height;
  const right = cx + HEX_WIDTH_PX / 2 + def.width;
  const bottom = cy + HEX_HEIGHT_PX / 2 + def.height;

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
 * Elevation contour lines
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

  for (let i = 1; i <= absElev; i++) {
    const scale = 0.85 - ((i - 1) / Math.max(absElev, 1)) * 0.5;
    const w = (hexWidth / 2) * scale;
    const h = (hexHeight / 2) * scale;

    const points = [
      [centerX + w, centerY],
      [centerX + w / 2, centerY + h],
      [centerX - w / 2, centerY + h],
      [centerX - w, centerY],
      [centerX - w / 2, centerY - h],
      [centerX + w / 2, centerY - h],
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

/**
 * Alignment marks for a quadrant
 */
function AlignmentMarks({
  quadrant,
  viewBoxX,
  viewBoxY,
}: {
  quadrant: Quadrant;
  viewBoxX: number;
  viewBoxY: number;
}) {
  const marks: React.ReactElement[] = [];
  const edgeOffset = 4;

  if (quadrant === 'top-left' || quadrant === 'bottom-left') {
    const x = viewBoxX + QUADRANT_WIDTH - edgeOffset;
    marks.push(
      <g key="right-marks">
        <line
          x1={x}
          y1={viewBoxY + QUADRANT_HEIGHT * 0.25}
          x2={x}
          y2={viewBoxY + QUADRANT_HEIGHT * 0.25 + MARK_SIZE}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={x}
          y1={viewBoxY + QUADRANT_HEIGHT * 0.5 - MARK_SIZE / 2}
          x2={x}
          y2={viewBoxY + QUADRANT_HEIGHT * 0.5 + MARK_SIZE / 2}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={x}
          y1={viewBoxY + QUADRANT_HEIGHT * 0.75 - MARK_SIZE}
          x2={x}
          y2={viewBoxY + QUADRANT_HEIGHT * 0.75}
          stroke="#666"
          strokeWidth="1"
        />
      </g>
    );
  }

  if (quadrant === 'top-right' || quadrant === 'bottom-right') {
    const x = viewBoxX + edgeOffset;
    marks.push(
      <g key="left-marks">
        <line
          x1={x}
          y1={viewBoxY + QUADRANT_HEIGHT * 0.25}
          x2={x}
          y2={viewBoxY + QUADRANT_HEIGHT * 0.25 + MARK_SIZE}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={x}
          y1={viewBoxY + QUADRANT_HEIGHT * 0.5 - MARK_SIZE / 2}
          x2={x}
          y2={viewBoxY + QUADRANT_HEIGHT * 0.5 + MARK_SIZE / 2}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={x}
          y1={viewBoxY + QUADRANT_HEIGHT * 0.75 - MARK_SIZE}
          x2={x}
          y2={viewBoxY + QUADRANT_HEIGHT * 0.75}
          stroke="#666"
          strokeWidth="1"
        />
      </g>
    );
  }

  if (quadrant === 'top-left' || quadrant === 'top-right') {
    const y = viewBoxY + QUADRANT_HEIGHT - edgeOffset;
    marks.push(
      <g key="bottom-marks">
        <line
          x1={viewBoxX + QUADRANT_WIDTH * 0.25}
          y1={y}
          x2={viewBoxX + QUADRANT_WIDTH * 0.25 + MARK_SIZE}
          y2={y}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={viewBoxX + QUADRANT_WIDTH * 0.5 - MARK_SIZE / 2}
          y1={y}
          x2={viewBoxX + QUADRANT_WIDTH * 0.5 + MARK_SIZE / 2}
          y2={y}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={viewBoxX + QUADRANT_WIDTH * 0.75 - MARK_SIZE}
          y1={y}
          x2={viewBoxX + QUADRANT_WIDTH * 0.75}
          y2={y}
          stroke="#666"
          strokeWidth="1"
        />
      </g>
    );
  }

  if (quadrant === 'bottom-left' || quadrant === 'bottom-right') {
    const y = viewBoxY + edgeOffset;
    marks.push(
      <g key="top-marks">
        <line
          x1={viewBoxX + QUADRANT_WIDTH * 0.25}
          y1={y}
          x2={viewBoxX + QUADRANT_WIDTH * 0.25 + MARK_SIZE}
          y2={y}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={viewBoxX + QUADRANT_WIDTH * 0.5 - MARK_SIZE / 2}
          y1={y}
          x2={viewBoxX + QUADRANT_WIDTH * 0.5 + MARK_SIZE / 2}
          y2={y}
          stroke="#666"
          strokeWidth="1"
        />
        <line
          x1={viewBoxX + QUADRANT_WIDTH * 0.75 - MARK_SIZE}
          y1={y}
          x2={viewBoxX + QUADRANT_WIDTH * 0.75}
          y2={y}
          stroke="#666"
          strokeWidth="1"
        />
      </g>
    );
  }

  return <>{marks}</>;
}

/**
 * Render a single quadrant of the map.
 * Matches MapPreview's rendering approach exactly.
 */
function QuadrantPage({
  grid,
  seed,
  display,
  quadrant,
}: {
  grid: HexGrid;
  seed: string;
  display: DisplayConfig;
  quadrant: Quadrant;
}) {
  const viewBoxX = quadrant.includes('right') ? QUADRANT_WIDTH : 0;
  const viewBoxY = quadrant.includes('bottom') ? QUADRANT_HEIGHT : 0;
  const clipPrefix = `clip-4x-${quadrant}`;

  return (
    <div className="print-4x-page">
      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${QUADRANT_WIDTH} ${QUADRANT_HEIGHT}`}
        className="w-full h-full"
        style={{ backgroundColor: 'white' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Pattern definitions */}
        <defs dangerouslySetInnerHTML={{ __html: generatePatternDefs() }} />

        {/* ClipPath definitions - absolute coordinates including PADDING */}
        <defs>
          {grid.map((column, col) =>
            column.map((hex, row) => {
              const terrain = hex.terrain;
              if (terrain === 'open' || terrain === 'blocking') return null;

              const center = hexCenter(col, row, HEX_WIDTH_PX);
              const points = hexPoints(center.x + PADDING, center.y + PADDING, HEX_WIDTH_PX);

              return (
                <clipPath key={`${clipPrefix}-${col}-${row}`} id={`${clipPrefix}-${col}-${row}`}>
                  <polygon points={points} />
                </clipPath>
              );
            })
          )}
        </defs>

        {/* Background */}
        <rect
          x={viewBoxX}
          y={viewBoxY}
          width={QUADRANT_WIDTH}
          height={QUADRANT_HEIGHT}
          fill="white"
        />

        {/* Border */}
        {display.showBorder && (
          <rect
            x={PADDING - 2}
            y={PADDING - 2}
            width={SVG_WIDTH - (PADDING - 2) * 2}
            height={SVG_HEIGHT - (PADDING - 2) * 2}
            fill="none"
            stroke="#ccc"
            strokeWidth="1"
          />
        )}

        {/* Hex grid - all in absolute coordinates (no transform group) */}
        {grid.map((column, col) =>
          column.map((hex, row) => {
            const center = hexCenter(col, row, HEX_WIDTH_PX);
            const absX = center.x + PADDING;
            const absY = center.y + PADDING;
            const points = hexPoints(absX, absY, HEX_WIDTH_PX);
            const props = TERRAIN_PROPERTIES[hex.terrain];
            const baseFill = getBaseFill(hex.terrain);
            const hasPattern = hex.terrain !== 'open' && hex.terrain !== 'blocking';
            const strokeColor = props.blocking ? '#000' : '#999';

            return (
              <g key={`hex-${col}-${row}`}>
                {/* Hex base fill */}
                <polygon points={points} fill={baseFill} stroke={strokeColor} strokeWidth="0.5" />

                {/* Inline pattern */}
                {hasPattern && (
                  <InlineHexPattern
                    terrain={hex.terrain}
                    centerX={center.x}
                    centerY={center.y}
                    clipId={`${clipPrefix}-${col}-${row}`}
                  />
                )}

                {/* Hex outline on top */}
                {hasPattern && (
                  <polygon points={points} fill="none" stroke={strokeColor} strokeWidth="0.5" />
                )}

                {/* Elevation contours */}
                {hex.elevation !== 0 && !props.blocking && !props.impassable && (
                  <ElevationContours
                    centerX={absX}
                    centerY={absY}
                    hexWidth={HEX_WIDTH_PX}
                    elevation={hex.elevation}
                  />
                )}

                {/* Elevation label */}
                {hex.elevation !== 0 && !props.blocking && !props.impassable && (
                  <g>
                    <rect
                      x={absX - HEX_WIDTH_PX * 0.22}
                      y={absY - HEX_WIDTH_PX * 0.18}
                      width={HEX_WIDTH_PX * 0.44}
                      height={HEX_WIDTH_PX * 0.34}
                      rx={2}
                      ry={2}
                      fill="white"
                    />
                    <text
                      x={absX}
                      y={absY + 2}
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

        {/* Alignment marks */}
        <AlignmentMarks quadrant={quadrant} viewBoxX={viewBoxX} viewBoxY={viewBoxY} />

        {/* Page number */}
        <text
          x={viewBoxX + QUADRANT_WIDTH - 8}
          y={viewBoxY + 12}
          textAnchor="end"
          fontSize="8"
          fontFamily="Arial, sans-serif"
          fill="#999"
        >
          Page{' '}
          {quadrant === 'top-left'
            ? '1'
            : quadrant === 'top-right'
              ? '2'
              : quadrant === 'bottom-left'
                ? '3'
                : '4'}{' '}
          of 4
        </text>

        {/* Seed watermark */}
        {display.showSeed && quadrant === 'bottom-right' && (
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

        {/* Note: Legend overlay is not supported in 4-page print mode due to coordinate system complexity.
            Use "Separate Page" legend option for 4-page prints. */}
      </svg>
    </div>
  );
}

/**
 * Renders all 4 quadrant pages for printing.
 */
export function Print4xPages({ grid, seed, display }: Print4xPagesProps) {
  return (
    <>
      <QuadrantPage grid={grid} seed={seed} display={display} quadrant="top-left" />
      <QuadrantPage grid={grid} seed={seed} display={display} quadrant="top-right" />
      <QuadrantPage grid={grid} seed={seed} display={display} quadrant="bottom-left" />
      <QuadrantPage grid={grid} seed={seed} display={display} quadrant="bottom-right" />
    </>
  );
}
