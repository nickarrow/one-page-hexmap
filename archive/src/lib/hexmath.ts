/**
 * Hex coordinate utilities for odd-q flat-topped hex grid.
 *
 * Coordinate system:
 * - q = column (0 to columns-1, left to right)
 * - r = row (0 to rows-1, top to bottom)
 * - Odd columns are offset down by half a hex height
 *
 * See PROJECT_FOUNDATION.md for full coordinate system documentation.
 */

/** ASCII code for 'A', used for column labels */
const ASCII_A = 65;

/**
 * Convert q,r coordinates to display label (A1, B2, etc.)
 * Supports columns beyond Z (AA, AB, etc.) for larger maps.
 */
export function coordToLabel(q: number, r: number): string {
  let col = '';
  let qTemp = q;
  do {
    col = String.fromCharCode(ASCII_A + (qTemp % 26)) + col;
    qTemp = Math.floor(qTemp / 26) - 1;
  } while (qTemp >= 0);

  const row = r + 1;
  return `${col}${row}`;
}

/**
 * Get the 6 neighboring hex coordinates for a given hex (odd-q layout)
 */
export function getNeighbors(q: number, r: number): Array<{ q: number; r: number }> {
  const isOddColumn = q % 2 === 1;

  if (isOddColumn) {
    return [
      { q: q + 1, r: r },
      { q: q + 1, r: r + 1 },
      { q: q, r: r + 1 },
      { q: q - 1, r: r + 1 },
      { q: q - 1, r: r },
      { q: q, r: r - 1 },
    ];
  } else {
    return [
      { q: q + 1, r: r - 1 },
      { q: q + 1, r: r },
      { q: q, r: r + 1 },
      { q: q - 1, r: r },
      { q: q - 1, r: r - 1 },
      { q: q, r: r - 1 },
    ];
  }
}

/**
 * Get valid neighbors within grid bounds
 */
export function getValidNeighbors(
  q: number,
  r: number,
  columns: number,
  rows: number
): Array<{ q: number; r: number }> {
  return getNeighbors(q, r).filter((n) => n.q >= 0 && n.q < columns && n.r >= 0 && n.r < rows);
}

/**
 * Convert offset coordinates to cube coordinates
 */
export function offsetToCube(q: number, r: number): { x: number; y: number; z: number } {
  const x = q;
  const z = r - (q - (q & 1)) / 2;
  const y = -x - z;
  return { x, y, z };
}

/**
 * Calculate hex distance between two hexes
 */
export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const cube1 = offsetToCube(q1, r1);
  const cube2 = offsetToCube(q2, r2);

  return Math.max(
    Math.abs(cube1.x - cube2.x),
    Math.abs(cube1.y - cube2.y),
    Math.abs(cube1.z - cube2.z)
  );
}

/**
 * Create a unique hex ID from coordinates
 */
export function hexId(q: number, r: number): string {
  return `${q}-${r}`;
}

/**
 * Parse hex ID back to coordinates
 */
export function parseHexId(id: string): { q: number; r: number } {
  const [q, r] = id.split('-').map(Number);
  return { q, r };
}

/**
 * Get all hexes within a certain distance of a center hex
 */
export function getHexesInRange(
  centerQ: number,
  centerR: number,
  range: number,
  columns: number,
  rows: number
): Array<{ q: number; r: number }> {
  const results: Array<{ q: number; r: number }> = [];

  for (let q = 0; q < columns; q++) {
    for (let r = 0; r < rows; r++) {
      if (hexDistance(centerQ, centerR, q, r) <= range) {
        results.push({ q, r });
      }
    }
  }

  return results;
}
