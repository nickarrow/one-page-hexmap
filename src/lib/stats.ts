/**
 * Calculate map statistics for OPR guideline compliance.
 */

import type { HexGrid, MapStats } from './types';
import { TERRAIN_PROPERTIES } from './types';
import { GRID_COLUMNS, GRID_ROWS, TOTAL_HEXES, STRATEGIC_LOS_ROWS } from './constants';
import { hexDistance } from './hexUtils';

/**
 * Calculate comprehensive statistics about a generated map.
 */
export function calculateMapStats(grid: HexGrid): MapStats {
  let terrainCount = 0;
  let blockingCount = 0;
  let impassableCount = 0;
  let coverCount = 0;
  let difficultCount = 0;
  let dangerousCount = 0;

  // Balance tracking (top vs bottom half)
  const midRow = Math.floor(GRID_ROWS / 2);
  let topTerrain = 0,
    bottomTerrain = 0;
  let topBlocking = 0,
    bottomBlocking = 0;
  let topCover = 0,
    bottomCover = 0;

  // Count terrain properties
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const hex = grid[col][row];
      if (hex.terrain === 'open') continue;

      terrainCount++;
      const props = TERRAIN_PROPERTIES[hex.terrain];
      const isTop = row < midRow;

      // Track balance
      if (isTop) {
        topTerrain++;
        if (props.blocking) topBlocking++;
        if (props.cover) topCover++;
      } else {
        bottomTerrain++;
        if (props.blocking) bottomBlocking++;
        if (props.cover) bottomCover++;
      }

      if (props.blocking) blockingCount++;
      if (props.impassable && !props.blocking) impassableCount++;
      if (props.cover) coverCount++;
      if (props.difficult) difficultCount++;
      if (props.dangerous) dangerousCount++;
    }
  }

  // Calculate percentages
  const coverage = terrainCount / TOTAL_HEXES;
  const blockingPercent = terrainCount > 0 ? blockingCount / terrainCount : 0;
  const impassablePercent = terrainCount > 0 ? impassableCount / terrainCount : 0;
  const coverPercent = terrainCount > 0 ? coverCount / terrainCount : 0;
  const difficultPercent = terrainCount > 0 ? difficultCount / terrainCount : 0;

  // Check edge-to-edge LOS
  const losBlocked = checkLOSBlocked(grid);

  // Calculate gaps
  const { maxGap, minPassage } = calculateGaps(grid);

  return {
    coverage,
    blockingPercent,
    impassablePercent,
    coverPercent,
    difficultPercent,
    dangerousCount,
    losBlocked,
    maxGap,
    minPassage,
    balance: {
      topTerrain,
      bottomTerrain,
      topBlocking,
      bottomBlocking,
      topCover,
      bottomCover,
    },
  };
}

/**
 * Check if edge-to-edge LOS is blocked.
 * We check strategic rows that divide the map into quarters.
 * Deployment is along long edges (top/bottom), so we block vertical sightlines.
 */
function checkLOSBlocked(grid: HexGrid): boolean {
  for (const row of STRATEGIC_LOS_ROWS) {
    let hasBlocker = false;
    for (let col = 0; col < GRID_COLUMNS; col++) {
      const terrain = grid[col][row].terrain;
      if (terrain === 'blocking') {
        hasBlocker = true;
        break;
      }
    }
    if (!hasBlocker) return false;
  }
  return true;
}

/**
 * Calculate maximum gap between terrain and minimum passage width.
 */
function calculateGaps(grid: HexGrid): { maxGap: number; minPassage: number } {
  // Find all terrain hex positions
  const terrainHexes: Array<{ col: number; row: number }> = [];

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain !== 'open') {
        terrainHexes.push({ col, row });
      }
    }
  }

  if (terrainHexes.length === 0) {
    return { maxGap: GRID_COLUMNS, minPassage: GRID_COLUMNS };
  }

  // Calculate max gap: for each open hex, find distance to nearest terrain
  let maxGap = 0;

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain !== 'open') continue;

      let minDist = Infinity;
      for (const t of terrainHexes) {
        const dist = hexDistance(col, row, t.col, t.row);
        if (dist < minDist) minDist = dist;
      }

      if (minDist > maxGap) maxGap = minDist;
    }
  }

  // Calculate min passage: find the widest clear corridor available
  // Since deployment is top/bottom, we check vertical corridors (columns)
  // This finds the largest gap in each column, then reports the minimum
  const blockingHexes = new Set<string>();
  for (const h of terrainHexes) {
    if (TERRAIN_PROPERTIES[grid[h.col][h.row].terrain].blocking) {
      blockingHexes.add(`${h.col},${h.row}`);
    }
  }

  let minPassage = GRID_ROWS;

  // For each column, find the largest open gap (best path through that column)
  for (let col = 0; col < GRID_COLUMNS; col++) {
    let currentGap = 0;
    let colMaxGap = 0;

    for (let row = 0; row < GRID_ROWS; row++) {
      if (blockingHexes.has(`${col},${row}`)) {
        if (currentGap > colMaxGap) colMaxGap = currentGap;
        currentGap = 0;
      } else {
        currentGap++;
      }
    }
    if (currentGap > colMaxGap) colMaxGap = currentGap;

    // The min passage is the worst column's best path
    if (colMaxGap < minPassage) {
      minPassage = colMaxGap;
    }
  }

  return { maxGap, minPassage };
}

/**
 * Get a simple compliance status for each stat.
 */
export function getComplianceStatus(stats: MapStats): Record<string, 'good' | 'warning' | 'bad'> {
  return {
    coverage: stats.coverage >= 0.25 ? 'good' : stats.coverage >= 0.15 ? 'warning' : 'bad',
    blocking:
      stats.blockingPercent >= 0.5 ? 'good' : stats.blockingPercent >= 0.35 ? 'warning' : 'bad',
    impassable: 'good', // No specific target for impassable
    cover: stats.coverPercent >= 0.33 ? 'good' : stats.coverPercent >= 0.2 ? 'warning' : 'bad',
    difficult:
      stats.difficultPercent >= 0.33 ? 'good' : stats.difficultPercent >= 0.2 ? 'warning' : 'bad',
    dangerous: stats.dangerousCount >= 2 ? 'good' : stats.dangerousCount >= 1 ? 'warning' : 'bad',
    los: stats.losBlocked ? 'good' : 'bad',
    maxGap: stats.maxGap <= 12 ? 'good' : stats.maxGap <= 15 ? 'warning' : 'bad',
    minPassage: stats.minPassage >= 6 ? 'good' : stats.minPassage >= 4 ? 'warning' : 'bad',
  };
}
