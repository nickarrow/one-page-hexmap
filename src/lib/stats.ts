/**
 * Calculate map statistics for OPR guideline compliance.
 */

import type { HexGrid, MapStats } from './types';
import { TERRAIN_PROPERTIES } from './types';
import {
  GRID_COLUMNS,
  GRID_ROWS,
  TOTAL_HEXES,
  TARGET_COVERAGE_MIN,
  TARGET_BLOCKING_MIN,
  TARGET_COVER_MIN,
  TARGET_DIFFICULT_MIN,
  TARGET_DANGEROUS_CLUSTERS,
  MAX_TERRAIN_GAP_HEXES,
  MIN_PASSAGE_WIDTH_HEXES,
} from './constants';
import { hexDistance, getNeighbors } from './hexUtils';

/**
 * Calculate comprehensive statistics about a generated map.
 */
export function calculateMapStats(grid: HexGrid, losCorridorWidth: number = 6): MapStats {
  let terrainCount = 0;
  let blockingCount = 0;
  let impassableCount = 0;
  let coverCount = 0;
  let difficultCount = 0;
  const dangerousHexes: Array<{ col: number; row: number }> = [];

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
      if (props.dangerous) dangerousHexes.push({ col, row });
    }
  }

  // Count dangerous clusters (not hexes) - OPR rule is "2+ pieces" not "2+ hexes"
  const dangerousClusters = findTerrainClusters(dangerousHexes);
  const dangerousCount = dangerousClusters.length;

  // Calculate percentages
  const coverage = terrainCount / TOTAL_HEXES;
  const blockingPercent = terrainCount > 0 ? blockingCount / terrainCount : 0;
  const impassablePercent = terrainCount > 0 ? impassableCount / terrainCount : 0;
  const coverPercent = terrainCount > 0 ? coverCount / terrainCount : 0;
  const difficultPercent = terrainCount > 0 ? difficultCount / terrainCount : 0;

  // Check edge-to-edge LOS using corridor width
  const { losBlocked, widestCorridor } = checkLOSCorridor(grid, losCorridorWidth);

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
    widestCorridor,
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
 * Check if there's an open corridor of the specified width from top to bottom.
 * Returns whether LOS is blocked and the width of the widest open corridor.
 *
 * A corridor is "open" if every column in that corridor has no blocking terrain
 * AND no elevated terrain (elevation >= 1) from row 0 to row GRID_ROWS-1.
 *
 * Elevation counts as LOS blocking because units behind hills can't be seen
 * by ground-level units on the other side.
 */
function checkLOSCorridor(
  grid: HexGrid,
  maxAllowedWidth: number
): { losBlocked: boolean; widestCorridor: number } {
  // First, determine which columns are "clear" (no blocking terrain or elevation top to bottom)
  const clearColumns: boolean[] = [];

  for (let col = 0; col < GRID_COLUMNS; col++) {
    let isClear = true;
    for (let row = 0; row < GRID_ROWS; row++) {
      const hex = grid[col][row];
      // Blocking terrain blocks LOS
      if (hex.terrain === 'blocking') {
        isClear = false;
        break;
      }
      // Elevated terrain (hills) also blocks LOS for ground-level units
      if (hex.elevation >= 1) {
        isClear = false;
        break;
      }
    }
    clearColumns[col] = isClear;
  }

  // Find the widest contiguous run of clear columns
  let widestCorridor = 0;
  let currentRun = 0;

  for (let col = 0; col < GRID_COLUMNS; col++) {
    if (clearColumns[col]) {
      currentRun++;
      widestCorridor = Math.max(widestCorridor, currentRun);
    } else {
      currentRun = 0;
    }
  }

  // LOS is blocked if the widest corridor is less than the allowed width
  const losBlocked = widestCorridor < maxAllowedWidth;

  return { losBlocked, widestCorridor };
}

/**
 * Calculate maximum gap between terrain pieces and minimum gap between impassable terrain.
 *
 * maxGap: The furthest any open hex is from terrain (largest "empty zone")
 * minPassage: The smallest gap between blocking/impassable clusters
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

  // Calculate maxGap: find the open hex that is furthest from any terrain
  // This measures the largest "empty zone" on the map
  // OPR guideline: "no gaps bigger than 12" between different terrain pieces"
  let maxGap = 0;

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain !== 'open') continue;

      // Find distance to nearest terrain
      let minDistToTerrain = Infinity;
      for (const t of terrainHexes) {
        const dist = hexDistance(col, row, t.col, t.row);
        if (dist < minDistToTerrain) {
          minDistToTerrain = dist;
          if (dist <= maxGap) break; // Early exit if we can't beat current max
        }
      }

      if (minDistToTerrain > maxGap) {
        maxGap = minDistToTerrain;
      }
    }
  }

  // Calculate min passage: minimum gap between blocking/impassable terrain clusters
  // OPR guideline: "gaps of at least 6" between terrain, so [large units] can fit through"
  const impassableHexes: Array<{ col: number; row: number }> = [];
  for (const h of terrainHexes) {
    const props = TERRAIN_PROPERTIES[grid[h.col][h.row].terrain];
    if (props.blocking || props.impassable) {
      impassableHexes.push(h);
    }
  }

  // If fewer than 2 impassable hexes, no chokepoints possible
  if (impassableHexes.length < 2) {
    return { maxGap, minPassage: GRID_COLUMNS };
  }

  // Group impassable hexes into connected clusters
  const impassableClusters = findTerrainClusters(impassableHexes);

  // If only one cluster, no inter-cluster gaps
  if (impassableClusters.length < 2) {
    return { maxGap, minPassage: GRID_COLUMNS };
  }

  // Find minimum distance between any two impassable clusters
  let minPassage = Infinity;

  for (let i = 0; i < impassableClusters.length; i++) {
    for (let j = i + 1; j < impassableClusters.length; j++) {
      const dist = clusterDistance(impassableClusters[i], impassableClusters[j]);
      if (dist < minPassage) {
        minPassage = dist;
      }
    }
  }

  // Convert to passage width (gap between clusters, not edge-to-edge distance)
  // Distance of 1 means adjacent hexes (0 gap), distance of 2 means 1 hex gap, etc.
  minPassage = minPassage > 0 ? minPassage - 1 : 0;

  return { maxGap, minPassage };
}

/**
 * Group hexes into connected clusters (adjacent hexes belong to same cluster).
 */
function findTerrainClusters(
  hexes: Array<{ col: number; row: number }>
): Array<Array<{ col: number; row: number }>> {
  const hexSet = new Set(hexes.map((h) => `${h.col},${h.row}`));
  const visited = new Set<string>();
  const clusters: Array<Array<{ col: number; row: number }>> = [];

  for (const hex of hexes) {
    const key = `${hex.col},${hex.row}`;
    if (visited.has(key)) continue;

    // BFS to find all connected hexes
    const cluster: Array<{ col: number; row: number }> = [];
    const queue = [hex];
    visited.add(key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);

      // Check all 6 hex neighbors using the shared utility
      const neighbors = getNeighbors(current.col, current.row);
      for (const n of neighbors) {
        const nKey = `${n.col},${n.row}`;
        if (hexSet.has(nKey) && !visited.has(nKey)) {
          visited.add(nKey);
          queue.push(n);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Find minimum hex distance between any hex in cluster A and any hex in cluster B.
 */
function clusterDistance(
  clusterA: Array<{ col: number; row: number }>,
  clusterB: Array<{ col: number; row: number }>
): number {
  let minDist = Infinity;

  for (const a of clusterA) {
    for (const b of clusterB) {
      const dist = hexDistance(a.col, a.row, b.col, b.row);
      if (dist < minDist) {
        minDist = dist;
      }
    }
  }

  return minDist;
}

/**
 * Get a simple compliance status for each stat.
 */
export function getComplianceStatus(stats: MapStats): Record<string, 'good' | 'warning' | 'bad'> {
  return {
    coverage:
      stats.coverage >= TARGET_COVERAGE_MIN
        ? 'good'
        : stats.coverage >= TARGET_COVERAGE_MIN * 0.6
          ? 'warning'
          : 'bad',
    blocking:
      stats.blockingPercent >= TARGET_BLOCKING_MIN
        ? 'good'
        : stats.blockingPercent >= TARGET_BLOCKING_MIN * 0.7
          ? 'warning'
          : 'bad',
    impassable: 'good', // No specific target for impassable
    cover:
      stats.coverPercent >= TARGET_COVER_MIN
        ? 'good'
        : stats.coverPercent >= TARGET_COVER_MIN * 0.6
          ? 'warning'
          : 'bad',
    difficult:
      stats.difficultPercent >= TARGET_DIFFICULT_MIN
        ? 'good'
        : stats.difficultPercent >= TARGET_DIFFICULT_MIN * 0.6
          ? 'warning'
          : 'bad',
    dangerous:
      stats.dangerousCount >= TARGET_DANGEROUS_CLUSTERS
        ? 'good'
        : stats.dangerousCount >= 1
          ? 'warning'
          : 'bad',
    los: stats.losBlocked ? 'good' : 'bad',
    maxGap: stats.maxGap <= MAX_TERRAIN_GAP_HEXES ? 'good' : stats.maxGap <= 15 ? 'warning' : 'bad',
    minPassage:
      stats.minPassage >= MIN_PASSAGE_WIDTH_HEXES
        ? 'good'
        : stats.minPassage >= 4
          ? 'warning'
          : 'bad',
  };
}

/**
 * Check if a map is fully OPR compliant.
 * Note: minPassage is a recommendation for large units, not a hard requirement.
 */
export function isOPRCompliant(stats: MapStats): boolean {
  return (
    stats.coverage >= TARGET_COVERAGE_MIN &&
    stats.blockingPercent >= TARGET_BLOCKING_MIN &&
    stats.coverPercent >= TARGET_COVER_MIN &&
    stats.difficultPercent >= TARGET_DIFFICULT_MIN &&
    stats.dangerousCount >= TARGET_DANGEROUS_CLUSTERS &&
    stats.losBlocked &&
    stats.maxGap <= MAX_TERRAIN_GAP_HEXES
    // minPassage >= 6 is a recommendation, not enforced
  );
}

/**
 * Get a compliance summary for logging/debugging.
 */
export function getComplianceSummary(stats: MapStats): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (stats.coverage < TARGET_COVERAGE_MIN)
    issues.push(
      `coverage ${(stats.coverage * 100).toFixed(0)}% < ${(TARGET_COVERAGE_MIN * 100).toFixed(0)}%`
    );
  if (stats.blockingPercent < TARGET_BLOCKING_MIN)
    issues.push(
      `blocking ${(stats.blockingPercent * 100).toFixed(0)}% < ${(TARGET_BLOCKING_MIN * 100).toFixed(0)}%`
    );
  if (stats.coverPercent < TARGET_COVER_MIN)
    issues.push(
      `cover ${(stats.coverPercent * 100).toFixed(0)}% < ${(TARGET_COVER_MIN * 100).toFixed(0)}%`
    );
  if (stats.difficultPercent < TARGET_DIFFICULT_MIN)
    issues.push(
      `difficult ${(stats.difficultPercent * 100).toFixed(0)}% < ${(TARGET_DIFFICULT_MIN * 100).toFixed(0)}%`
    );
  if (stats.dangerousCount < TARGET_DANGEROUS_CLUSTERS)
    issues.push(`dangerous ${stats.dangerousCount} < ${TARGET_DANGEROUS_CLUSTERS}`);
  if (!stats.losBlocked) issues.push(`LOS corridor ${stats.widestCorridor} cols wide`);
  if (stats.maxGap > MAX_TERRAIN_GAP_HEXES)
    issues.push(`maxGap ${stats.maxGap} > ${MAX_TERRAIN_GAP_HEXES}`);
  // minPassage is a recommendation, not tracked as an issue

  return {
    compliant: issues.length === 0,
    issues,
  };
}

/**
 * Convert LOS strictness (0-1) to corridor width threshold.
 * 0 (lenient) = 8 columns, 0.5 (default) = 6 columns, 1 (strict) = 4 columns
 */
export function losStrictnessToCorridorWidth(strictness: number): number {
  // Linear interpolation: 8 at 0, 6 at 0.5, 4 at 1
  return Math.round(8 - strictness * 4);
}
