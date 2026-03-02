/**
 * Hex grid utilities for flat-topped hexes using offset coordinates (odd-q).
 */

import { GRID_COLUMNS, GRID_ROWS, HEX_HEIGHT_RATIO } from './constants';

// =============================================================================
// COORDINATE TYPES
// =============================================================================

export interface HexCoord {
  col: number;
  row: number;
}

export interface CubeCoord {
  x: number;
  y: number;
  z: number;
}

// =============================================================================
// COORDINATE CONVERSIONS
// =============================================================================

/**
 * Convert offset coordinates to cube coordinates.
 * Cube coordinates make distance calculations easier.
 */
export function offsetToCube(col: number, row: number): CubeCoord {
  const x = col;
  const z = row - Math.floor((col - (col & 1)) / 2);
  const y = -x - z;
  return { x, y, z };
}

/**
 * Convert cube coordinates back to offset coordinates.
 */
export function cubeToOffset(x: number, z: number): HexCoord {
  const col = x;
  const row = z + Math.floor((x - (x & 1)) / 2);
  return { col, row };
}

// =============================================================================
// DISTANCE & NEIGHBORS
// =============================================================================

/**
 * Calculate hex distance between two hexes.
 * In a hex grid, this is the minimum number of steps to get from A to B.
 */
export function hexDistance(col1: number, row1: number, col2: number, row2: number): number {
  const a = offsetToCube(col1, row1);
  const b = offsetToCube(col2, row2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

/**
 * Get the 6 neighboring hex coordinates for a given hex.
 * Uses odd-q offset coordinate system for flat-topped hexes.
 */
export function getNeighbors(col: number, row: number): HexCoord[] {
  const isOddColumn = col % 2 === 1;

  // Neighbor offsets differ based on column parity
  const offsets = isOddColumn
    ? [
        { col: 1, row: 0 }, // East
        { col: 1, row: 1 }, // Southeast
        { col: 0, row: 1 }, // South
        { col: -1, row: 1 }, // Southwest
        { col: -1, row: 0 }, // West
        { col: 0, row: -1 }, // North
      ]
    : [
        { col: 1, row: -1 }, // Northeast
        { col: 1, row: 0 }, // East
        { col: 0, row: 1 }, // South
        { col: -1, row: 0 }, // Southwest
        { col: -1, row: -1 }, // Northwest
        { col: 0, row: -1 }, // North
      ];

  return offsets.map((offset) => ({
    col: col + offset.col,
    row: row + offset.row,
  }));
}

/**
 * Get neighbors that are within grid bounds.
 */
export function getValidNeighbors(col: number, row: number): HexCoord[] {
  return getNeighbors(col, row).filter(
    (n) => n.col >= 0 && n.col < GRID_COLUMNS && n.row >= 0 && n.row < GRID_ROWS
  );
}

// =============================================================================
// GRID UTILITIES
// =============================================================================

/**
 * Check if coordinates are within grid bounds.
 */
export function isValidCoord(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLUMNS && row >= 0 && row < GRID_ROWS;
}

/**
 * Create a unique string key for a hex coordinate.
 */
export function hexKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Parse a hex key back to coordinates.
 */
export function parseHexKey(key: string): HexCoord {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

/**
 * Iterate over all hexes in the grid.
 */
export function* allHexCoords(): Generator<HexCoord> {
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      yield { col, row };
    }
  }
}

// =============================================================================
// HEX GEOMETRY (for rendering)
// =============================================================================

/**
 * Calculate the center point of a hex in pixel coordinates.
 * For flat-topped hexes with odd-q offset layout.
 *
 * @param col - Column index
 * @param row - Row index
 * @param hexWidth - Width of hex (flat edge to flat edge)
 */
export function hexCenter(col: number, row: number, hexWidth: number): { x: number; y: number } {
  const hexHeight = hexWidth * HEX_HEIGHT_RATIO;
  const horizontalSpacing = hexWidth * 0.75;

  // X position: each column is spaced by 3/4 hex width, plus half width for center
  const x = col * horizontalSpacing + hexWidth / 2;

  // Y position: each row is spaced by hex height, plus half height for center
  // Odd columns are offset down by half a hex height
  const yOffset = col % 2 === 1 ? hexHeight / 2 : 0;
  const y = row * hexHeight + hexHeight / 2 + yOffset;

  return { x, y };
}

/**
 * Generate SVG polygon points for a flat-topped hexagon.
 * Returns points as "x1,y1 x2,y2 ..." string for polygon.
 *
 * Flat-topped hex vertices (starting from right, going clockwise):
 *       ___
 *      /   \
 *     /     \
 *     \     /
 *      \___/
 */
export function hexPoints(centerX: number, centerY: number, hexWidth: number): string {
  const hexHeight = hexWidth * HEX_HEIGHT_RATIO;
  const w = hexWidth / 2; // Half width
  const h = hexHeight / 2; // Half height

  // Flat-topped hex: 6 vertices
  // Starting from right point, going clockwise
  const points = [
    [centerX + w, centerY], // Right (3 o'clock)
    [centerX + w / 2, centerY + h], // Bottom-right (5 o'clock)
    [centerX - w / 2, centerY + h], // Bottom-left (7 o'clock)
    [centerX - w, centerY], // Left (9 o'clock)
    [centerX - w / 2, centerY - h], // Top-left (11 o'clock)
    [centerX + w / 2, centerY - h], // Top-right (1 o'clock)
  ];

  return points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}
