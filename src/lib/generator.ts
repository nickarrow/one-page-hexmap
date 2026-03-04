/**
 * Procedural hex map generator following OPR terrain placement guidelines.
 *
 * Philosophy: Emulate how humans place terrain:
 * 1. Scatter terrain freely across the map
 * 2. Measure compliance with OPR guidelines
 * 3. Nudge toward compliance if needed
 * 4. Apply optional enhancements (symmetry, elevation)
 */

import type { HexGrid, TerrainType, GeneratorConfig, MapStats } from './types';
import { TERRAIN_PROPERTIES } from './types';
import {
  GRID_COLUMNS,
  GRID_ROWS,
  PIECE_SIZE_SMALL,
  PIECE_SIZE_MEDIUM,
  PIECE_SIZE_LARGE,
  EDGE_BUFFER_SIZE,
  ELEVATION_CLUSTER_COUNT_BASE,
  ELEVATION_CLUSTER_COUNT_MULTIPLIER,
  ELEVATION_CLUSTER_SIZE_BASE,
  ELEVATION_CLUSTER_SIZE_MULTIPLIER,
  ELEVATION_PROB_HIGH,
  ELEVATION_PROB_MID,
  ELEVATION_PROB_LOW,
  ELEVATION_SCATTER_BASE,
  ELEVATION_SCATTER_MULTIPLIER,
  DEFAULT_DENSITY,
  DEFAULT_TERRAIN_MIX,
  DEFAULT_SPREAD,
  DEFAULT_SYMMETRY,
  DEFAULT_PIECE_SIZE,
  DEFAULT_LOS_STRICTNESS,
  DEFAULT_EDGE_BUFFER,
  DEFAULT_MIN_PASSAGE,
  TARGET_COVERAGE_MIN,
  TARGET_COVER_MIN,
  TARGET_DIFFICULT_MIN,
  TARGET_DANGEROUS_CLUSTERS,
  MAX_TERRAIN_GAP_HEXES,
  MAX_NUDGE_ITERATIONS,
  MAX_COVERAGE_THRESHOLD,
  BLOCKING_TARGET_LOW,
  BLOCKING_TARGET_HIGH,
  PROTECTION_THRESHOLD,
  MIN_DANGEROUS_PROTECT,
  BASE_PIECES,
  PIECES_PER_DENSITY,
  NUDGE_PIECE_SIZE,
  FORCED_PIECE_SIZE,
  PIECE_SIZE_THRESHOLD_SMALL,
  PIECE_SIZE_THRESHOLD_LARGE,
  SCATTER_RISE_PROBABILITY,
} from './constants';
import { createSeededRandom, randomInt, pickRandom, shuffleArray, chance } from './random';
import { getValidNeighbors, hexDistance, hexKey, isValidCoord } from './hexUtils';
import {
  calculateMapStats,
  isOPRCompliant,
  getComplianceSummary,
  losStrictnessToCorridorWidth,
} from './stats';

// =============================================================================
// GRID UTILITIES
// =============================================================================

export function createEmptyGrid(): HexGrid {
  const grid: HexGrid = [];
  for (let col = 0; col < GRID_COLUMNS; col++) {
    grid[col] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      grid[col][row] = { col, row, terrain: 'open', elevation: 0 };
    }
  }
  return grid;
}

// =============================================================================
// CONFIG HELPERS
// =============================================================================

/**
 * Check if config is using default settings (for strict compliance mode).
 */
function isDefaultConfig(config: GeneratorConfig): boolean {
  return (
    Math.abs(config.density - DEFAULT_DENSITY) < 0.01 &&
    Math.abs(config.terrainMix.blocking - DEFAULT_TERRAIN_MIX.blocking) < 0.01 &&
    Math.abs(config.terrainMix.cover - DEFAULT_TERRAIN_MIX.cover) < 0.01 &&
    Math.abs(config.terrainMix.difficult - DEFAULT_TERRAIN_MIX.difficult) < 0.01 &&
    Math.abs(config.pieceSize - DEFAULT_PIECE_SIZE) < 0.01 &&
    Math.abs(config.spread - DEFAULT_SPREAD) < 0.01 &&
    Math.abs(config.losStrictness - DEFAULT_LOS_STRICTNESS) < 0.01 &&
    config.symmetry === DEFAULT_SYMMETRY &&
    config.edgeBuffer === DEFAULT_EDGE_BUFFER &&
    config.minPassage === DEFAULT_MIN_PASSAGE
  );
}

function getPieceSizeRange(pieceSize: number): { min: number; max: number } {
  if (pieceSize < PIECE_SIZE_THRESHOLD_SMALL) return PIECE_SIZE_SMALL;
  if (pieceSize < PIECE_SIZE_THRESHOLD_LARGE) return PIECE_SIZE_MEDIUM;
  return PIECE_SIZE_LARGE;
}

// =============================================================================
// PHASE 1: SCATTER TERRAIN FREELY
// =============================================================================

interface ScatterConfig {
  targetPieces: number;
  sizeRange: { min: number; max: number };
  terrainWeights: { type: TerrainType; weight: number }[];
  minSpacing: number;
  minBlockingSpacing: number; // Extra spacing between blocking terrain
  edgeBuffer: number;
  halfOnly?: 'top' | 'bottom';
}

/**
 * Scatter terrain pieces randomly across the map.
 * This is the "grab pieces and put them down" phase.
 */
function scatterTerrain(grid: HexGrid, config: ScatterConfig, random: () => number): void {
  const occupied = new Set<string>();
  const blockingPositions: Array<{ col: number; row: number }> = [];

  // Mark existing terrain as occupied
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain !== 'open') {
        occupied.add(hexKey(col, row));
        if (grid[col][row].terrain === 'blocking') {
          blockingPositions.push({ col, row });
        }
      }
    }
  }

  for (let piece = 0; piece < config.targetPieces; piece++) {
    // Pick a terrain type based on weights
    const terrainType = pickWeightedTerrain(config.terrainWeights, random);
    const isBlocking = terrainType === 'blocking';

    // Find a valid position (with extra spacing for blocking terrain)
    const position = findScatterPosition(
      grid,
      occupied,
      random,
      config.minSpacing,
      config.edgeBuffer,
      config.halfOnly,
      isBlocking ? blockingPositions : undefined,
      isBlocking ? config.minBlockingSpacing : undefined
    );
    if (!position) continue;

    // Grow the piece
    const targetSize = randomInt(config.sizeRange.min, config.sizeRange.max, random);
    const pieceHexes = growPiece(
      grid,
      position.col,
      position.row,
      targetSize,
      occupied,
      random,
      config.edgeBuffer,
      config.halfOnly
    );

    if (pieceHexes.size === 0) continue;

    // Apply terrain
    for (const key of pieceHexes) {
      const [col, row] = key.split(',').map(Number);
      grid[col][row].terrain = terrainType;
      occupied.add(key);
      if (isBlocking) {
        blockingPositions.push({ col, row });
      }
    }
  }
}

function pickWeightedTerrain(
  weights: { type: TerrainType; weight: number }[],
  random: () => number
): TerrainType {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let roll = random() * totalWeight;

  for (const { type, weight } of weights) {
    roll -= weight;
    if (roll <= 0) return type;
  }

  return weights[weights.length - 1].type;
}

function findScatterPosition(
  grid: HexGrid,
  occupied: Set<string>,
  random: () => number,
  minSpacing: number,
  edgeBuffer: number,
  halfOnly?: 'top' | 'bottom',
  blockingPositions?: Array<{ col: number; row: number }>,
  minBlockingSpacing?: number
): { col: number; row: number } | null {
  // Apply edge buffer to column bounds
  const colMin = edgeBuffer;
  const colMax = GRID_COLUMNS - 1 - edgeBuffer;

  // Apply edge buffer and half-only constraints to row bounds
  let rowMin = edgeBuffer;
  let rowMax = GRID_ROWS - 1 - edgeBuffer;

  if (halfOnly === 'bottom') {
    rowMin = Math.max(rowMin, Math.floor(GRID_ROWS / 2));
  } else if (halfOnly === 'top') {
    rowMax = Math.min(rowMax, Math.floor(GRID_ROWS / 2) - 1);
  }

  // Try random positions
  for (let attempt = 0; attempt < 100; attempt++) {
    const col = randomInt(colMin, colMax, random);
    const row = randomInt(rowMin, rowMax, random);
    const key = hexKey(col, row);

    if (occupied.has(key) || grid[col][row].terrain !== 'open') continue;

    // Check spacing from other terrain
    let tooClose = false;
    for (let dc = -minSpacing; dc <= minSpacing && !tooClose; dc++) {
      for (let dr = -minSpacing; dr <= minSpacing && !tooClose; dr++) {
        const nc = col + dc;
        const nr = row + dr;
        if (!isValidCoord(nc, nr)) continue;
        if (grid[nc][nr].terrain !== 'open') {
          if (hexDistance(col, row, nc, nr) < minSpacing) {
            tooClose = true;
          }
        }
      }
    }

    if (tooClose) continue;

    // Extra check for blocking terrain spacing
    if (blockingPositions && minBlockingSpacing) {
      let tooCloseToBlocking = false;
      for (const bp of blockingPositions) {
        if (hexDistance(col, row, bp.col, bp.row) < minBlockingSpacing) {
          tooCloseToBlocking = true;
          break;
        }
      }
      if (tooCloseToBlocking) continue;
    }

    return { col, row };
  }

  // Fallback: find any open position within bounds (less strict on spacing)
  for (let attempt = 0; attempt < 50; attempt++) {
    const col = randomInt(colMin, colMax, random);
    const row = randomInt(rowMin, rowMax, random);
    if (!occupied.has(hexKey(col, row)) && grid[col][row].terrain === 'open') {
      // Still enforce blocking spacing in fallback if possible
      if (blockingPositions && minBlockingSpacing) {
        let tooCloseToBlocking = false;
        for (const bp of blockingPositions) {
          if (hexDistance(col, row, bp.col, bp.row) < minBlockingSpacing) {
            tooCloseToBlocking = true;
            break;
          }
        }
        if (tooCloseToBlocking) continue;
      }
      return { col, row };
    }
  }

  return null;
}

function growPiece(
  grid: HexGrid,
  startCol: number,
  startRow: number,
  targetSize: number,
  occupied: Set<string>,
  random: () => number,
  edgeBuffer: number = 0,
  halfOnly?: 'top' | 'bottom'
): Set<string> {
  const piece = new Set<string>();
  const startKey = hexKey(startCol, startRow);

  if (occupied.has(startKey) || grid[startCol][startRow].terrain !== 'open') {
    return piece;
  }

  // Calculate bounds with edge buffer
  const colMin = edgeBuffer;
  const colMax = GRID_COLUMNS - 1 - edgeBuffer;
  let rowMin = edgeBuffer;
  let rowMax = GRID_ROWS - 1 - edgeBuffer;

  if (halfOnly === 'bottom') {
    rowMin = Math.max(rowMin, Math.floor(GRID_ROWS / 2));
  } else if (halfOnly === 'top') {
    rowMax = Math.min(rowMax, Math.floor(GRID_ROWS / 2) - 1);
  }

  piece.add(startKey);
  const frontier = [{ col: startCol, row: startRow }];

  while (piece.size < targetSize && frontier.length > 0) {
    const idx = Math.floor(random() * frontier.length);
    const current = frontier[idx];
    const neighbors = shuffleArray([...getValidNeighbors(current.col, current.row)], random);

    let added = false;
    for (const neighbor of neighbors) {
      if (piece.size >= targetSize) break;
      // Respect edge buffer and half-only constraints
      if (neighbor.col < colMin || neighbor.col > colMax) continue;
      if (neighbor.row < rowMin || neighbor.row > rowMax) continue;

      const nKey = hexKey(neighbor.col, neighbor.row);
      if (occupied.has(nKey) || piece.has(nKey)) continue;
      if (grid[neighbor.col][neighbor.row].terrain !== 'open') continue;

      // Keep pieces somewhat compact
      const dist = hexDistance(startCol, startRow, neighbor.col, neighbor.row);
      if (dist > Math.ceil(Math.sqrt(targetSize)) + 1) continue;

      piece.add(nKey);
      frontier.push(neighbor);
      added = true;
    }

    if (!added) frontier.splice(idx, 1);
  }

  return piece;
}

// =============================================================================
// PHASE 2: MEASURE COMPLIANCE (uses stats.ts)
// =============================================================================

// Compliance checking is done via calculateMapStats() and isOPRCompliant()

// =============================================================================
// PHASE 3: NUDGE TOWARD COMPLIANCE
// =============================================================================

/**
 * Get all blocking terrain positions from the grid.
 */
function getBlockingPositions(grid: HexGrid): Array<{ col: number; row: number }> {
  const positions: Array<{ col: number; row: number }> = [];
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain === 'blocking') {
        positions.push({ col, row });
      }
    }
  }
  return positions;
}

/**
 * Check if a position is far enough from all blocking terrain.
 */
function isValidBlockingPosition(
  col: number,
  row: number,
  blockingPositions: Array<{ col: number; row: number }>,
  minDistance: number
): boolean {
  for (const bp of blockingPositions) {
    if (hexDistance(col, row, bp.col, bp.row) < minDistance) {
      return false;
    }
  }
  return true;
}

/**
 * Nudge the map toward OPR compliance by making targeted fixes.
 * When symmetry is enabled, nudges are mirrored to maintain balance.
 * Respects terrainMix settings - won't add terrain types that are "off" (0).
 */
function nudgeTowardCompliance(
  grid: HexGrid,
  random: () => number,
  terrainMix: GeneratorConfig['terrainMix'],
  maxNudges: number = MAX_NUDGE_ITERATIONS,
  symmetry: boolean = false,
  losCorridorWidth: number = 6,
  minBlockingSpacing: number = 4
): void {
  // Check which terrain types are enabled (not "off")
  const blockingEnabled = terrainMix.blocking > 0;
  const coverEnabled = terrainMix.cover > 0;
  const difficultEnabled = terrainMix.difficult > 0;
  const dangerousEnabled = terrainMix.dangerous > 0;

  for (let nudge = 0; nudge < maxNudges; nudge++) {
    const currentStats = calculateMapStats(grid, losCorridorWidth);
    const { compliant } = getComplianceSummary(currentStats);

    if (compliant) break;

    // First priority: if coverage is too high, remove terrain (smart removal protects low types)
    if (currentStats.coverage > MAX_COVERAGE_THRESHOLD) {
      nudgeRemoveTerrain(grid, random, symmetry);
      continue;
    }

    // Fix one issue at a time, prioritizing the most impactful
    if (currentStats.maxGap > MAX_TERRAIN_GAP_HEXES) {
      // Big gaps are a major issue - fill them first
      // Use blocking if enabled, otherwise cover-difficult
      if (blockingEnabled) {
        nudgeFillGap(grid, random, symmetry, minBlockingSpacing);
      } else if (coverEnabled || difficultEnabled) {
        nudgeAddTerrain(grid, random, 'cover-difficult', symmetry);
      }
    } else if (!currentStats.losBlocked && blockingEnabled) {
      // LOS blocking requires blocking terrain
      nudgeLOSBlocking(grid, random, symmetry, currentStats.widestCorridor, minBlockingSpacing);
    } else if (currentStats.blockingPercent < BLOCKING_TARGET_LOW && blockingEnabled) {
      // Blocking is critical - aim slightly above 50% to avoid edge cases
      nudgeAddBlockingTerrain(grid, random, symmetry, minBlockingSpacing);
    } else if (
      currentStats.blockingPercent > BLOCKING_TARGET_HIGH &&
      (currentStats.coverPercent < TARGET_COVER_MIN ||
        currentStats.difficultPercent < TARGET_DIFFICULT_MIN) &&
      (coverEnabled || difficultEnabled)
    ) {
      // Blocking is high but cover/difficult are low - convert some blocking to cover-difficult
      nudgeConvertBlockingToCoverDifficult(grid, random, symmetry);
    } else if (currentStats.coverage < TARGET_COVERAGE_MIN) {
      // Add any enabled terrain type
      if (coverEnabled || difficultEnabled) {
        nudgeAddTerrain(grid, random, 'cover-difficult', symmetry);
      } else if (blockingEnabled) {
        nudgeAddBlockingTerrain(grid, random, symmetry, minBlockingSpacing);
      }
    } else if (currentStats.coverPercent < TARGET_COVER_MIN && coverEnabled) {
      nudgeAddTerrain(grid, random, 'cover', symmetry);
    } else if (currentStats.difficultPercent < TARGET_DIFFICULT_MIN && difficultEnabled) {
      nudgeAddTerrain(grid, random, 'difficult', symmetry);
    } else if (currentStats.dangerousCount < TARGET_DANGEROUS_CLUSTERS && dangerousEnabled) {
      nudgeAddTerrain(grid, random, 'dangerous', symmetry);
    } else if (currentStats.minPassage < 6) {
      // This is hard to fix - try removing a blocking piece
      nudgeRemoveBlockingPiece(grid, random, symmetry);
    }
  }
}

/**
 * Find the largest gap in terrain and add a piece there.
 * Uses blocking terrain to help both gap and blocking% stats.
 * Respects minimum spacing between blocking terrain.
 */
function nudgeFillGap(
  grid: HexGrid,
  random: () => number,
  symmetry: boolean,
  minBlockingSpacing: number
): void {
  const blockingPositions = getBlockingPositions(grid);

  // Find the hex that is furthest from any terrain AND respects blocking spacing
  let maxDist = 0;
  let bestCol = -1;
  let bestRow = -1;

  // Sample positions across the map to find the biggest gap
  const edgeBuffer = EDGE_BUFFER_SIZE;
  for (let col = edgeBuffer; col < GRID_COLUMNS - edgeBuffer; col += 2) {
    for (let row = edgeBuffer; row < GRID_ROWS - edgeBuffer; row += 2) {
      if (grid[col][row].terrain !== 'open') continue;

      // Check if this position respects blocking spacing
      if (!isValidBlockingPosition(col, row, blockingPositions, minBlockingSpacing)) continue;

      // Find distance to nearest terrain
      let minDistToTerrain = Infinity;
      for (let tc = 0; tc < GRID_COLUMNS; tc++) {
        for (let tr = 0; tr < GRID_ROWS; tr++) {
          if (grid[tc][tr].terrain !== 'open') {
            const dist = hexDistance(col, row, tc, tr);
            if (dist < minDistToTerrain) {
              minDistToTerrain = dist;
            }
          }
        }
      }

      if (minDistToTerrain > maxDist) {
        maxDist = minDistToTerrain;
        bestCol = col;
        bestRow = row;
      }
    }
  }

  // If no valid position found, fall back to non-blocking terrain
  if (bestCol === -1) {
    // Add cover-difficult instead to avoid creating tight passages
    for (let col = edgeBuffer; col < GRID_COLUMNS - edgeBuffer; col += 2) {
      for (let row = edgeBuffer; row < GRID_ROWS - edgeBuffer; row += 2) {
        if (grid[col][row].terrain === 'open') {
          addSmallPiece(grid, col, row, 'cover-difficult', random, symmetry, 0);
          return;
        }
      }
    }
    return;
  }

  // Add blocking terrain at the most isolated spot
  addSmallPiece(grid, bestCol, bestRow, 'blocking', random, symmetry, minBlockingSpacing);
}

/**
 * Add blocking terrain to break up open corridors.
 * Finds the widest open corridor and places blocking terrain in it.
 * Respects minimum spacing between blocking terrain.
 */
function nudgeLOSBlocking(
  grid: HexGrid,
  random: () => number,
  symmetry: boolean,
  _widestCorridor: number,
  minBlockingSpacing: number
): void {
  const blockingPositions = getBlockingPositions(grid);

  // Find where the widest corridor is
  let corridorStart = -1;
  let currentRun = 0;
  let maxRun = 0;
  let maxRunStart = 0;

  for (let col = 0; col < GRID_COLUMNS; col++) {
    let isClear = true;
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain === 'blocking') {
        isClear = false;
        break;
      }
    }

    if (isClear) {
      if (corridorStart === -1) corridorStart = col;
      currentRun++;
      if (currentRun > maxRun) {
        maxRun = currentRun;
        maxRunStart = corridorStart;
      }
    } else {
      corridorStart = -1;
      currentRun = 0;
    }
  }

  if (maxRun === 0) return;

  // Place blocking terrain in the middle of the corridor
  const targetCol = maxRunStart + Math.floor(maxRun / 2);

  // Find a row that respects blocking spacing
  const candidateRows: number[] = [];
  for (let row = Math.floor(GRID_ROWS / 4); row < Math.floor((GRID_ROWS * 3) / 4); row++) {
    if (
      grid[targetCol][row].terrain === 'open' &&
      isValidBlockingPosition(targetCol, row, blockingPositions, minBlockingSpacing)
    ) {
      candidateRows.push(row);
    }
  }

  if (candidateRows.length > 0) {
    const targetRow = pickRandom(candidateRows, random);
    addSmallPiece(grid, targetCol, targetRow, 'blocking', random, symmetry, minBlockingSpacing);
  } else {
    // Fallback: add cover-difficult instead
    const targetRow = randomInt(GRID_ROWS / 4, (GRID_ROWS * 3) / 4, random);
    if (grid[targetCol][targetRow].terrain === 'open') {
      addSmallPiece(grid, targetCol, targetRow, 'cover-difficult', random, symmetry, 0);
    }
  }
}

/**
 * Add a small terrain piece of the specified type.
 */
function nudgeAddTerrain(
  grid: HexGrid,
  random: () => number,
  terrainType: TerrainType,
  symmetry: boolean
): void {
  // Find an open area
  for (let attempt = 0; attempt < 50; attempt++) {
    const col = randomInt(2, GRID_COLUMNS - 3, random);
    const row = randomInt(2, GRID_ROWS - 3, random);

    if (grid[col][row].terrain === 'open') {
      addSmallPiece(grid, col, row, terrainType, random, symmetry, 0);
      return;
    }
  }
}

/**
 * Convert some blocking terrain to cover-difficult.
 * Used when blocking% is high but cover/difficult% are low.
 * Picks blocking hexes that are NOT critical for LOS blocking.
 * Converts 3-5 hexes at once for faster rebalancing.
 */
function nudgeConvertBlockingToCoverDifficult(
  grid: HexGrid,
  random: () => number,
  symmetry: boolean
): void {
  // Find blocking hexes that could be converted
  // Prefer hexes that have other blocking terrain nearby (so LOS is still blocked)
  const candidates: Array<{ col: number; row: number; score: number }> = [];

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain !== 'blocking') continue;

      // Count nearby blocking terrain (within 3 hexes)
      let nearbyBlocking = 0;
      for (let dc = -3; dc <= 3; dc++) {
        for (let dr = -3; dr <= 3; dr++) {
          const nc = col + dc;
          const nr = row + dr;
          if (nc < 0 || nc >= GRID_COLUMNS || nr < 0 || nr >= GRID_ROWS) continue;
          if (nc === col && nr === row) continue;
          if (grid[nc][nr].terrain === 'blocking') nearbyBlocking++;
        }
      }

      // Higher score = more likely to convert (has backup blocking nearby)
      candidates.push({ col, row, score: nearbyBlocking });
    }
  }

  if (candidates.length === 0) return;

  // Sort by score descending (prefer hexes with more nearby blocking)
  candidates.sort((a, b) => b.score - a.score);

  // Convert 3-5 hexes at once for faster rebalancing
  const numToConvert = Math.min(randomInt(3, 5, random), candidates.length);
  const converted = new Set<string>();

  for (let i = 0; i < numToConvert && i < candidates.length; i++) {
    // Pick from top candidates (those with good backup blocking)
    const topCandidates = candidates.filter(
      (c) => c.score >= candidates[0].score - 2 && !converted.has(`${c.col},${c.row}`)
    );
    if (topCandidates.length === 0) break;

    const chosen = pickRandom(topCandidates, random);
    converted.add(`${chosen.col},${chosen.row}`);

    grid[chosen.col][chosen.row].terrain = 'cover-difficult';

    // Mirror if symmetry enabled
    if (symmetry) {
      const mirrorRow = GRID_ROWS - 1 - chosen.row;
      if (mirrorRow !== chosen.row && grid[chosen.col][mirrorRow].terrain === 'blocking') {
        grid[chosen.col][mirrorRow].terrain = 'cover-difficult';
        converted.add(`${chosen.col},${mirrorRow}`);
      }
    }
  }
}

/**
 * Add blocking terrain strategically - prefer areas that help with LOS blocking.
 * Places blocking terrain in columns that don't already have blocking.
 * Respects minimum spacing between blocking terrain.
 */
function nudgeAddBlockingTerrain(
  grid: HexGrid,
  random: () => number,
  symmetry: boolean,
  minBlockingSpacing: number
): void {
  const blockingPositions = getBlockingPositions(grid);

  // Find columns without blocking terrain (these are good candidates)
  const columnsWithoutBlocking: number[] = [];

  for (let col = 2; col < GRID_COLUMNS - 2; col++) {
    let hasBlocking = false;
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain === 'blocking') {
        hasBlocking = true;
        break;
      }
    }
    if (!hasBlocking) {
      columnsWithoutBlocking.push(col);
    }
  }

  // Try columns without blocking first
  if (columnsWithoutBlocking.length > 0) {
    // Shuffle and try each column
    const shuffledCols = shuffleArray([...columnsWithoutBlocking], random);
    for (const targetCol of shuffledCols) {
      // Find an open row that respects blocking spacing
      const candidateRows: number[] = [];
      for (let row = 2; row < GRID_ROWS - 2; row++) {
        if (
          grid[targetCol][row].terrain === 'open' &&
          isValidBlockingPosition(targetCol, row, blockingPositions, minBlockingSpacing)
        ) {
          candidateRows.push(row);
        }
      }
      if (candidateRows.length > 0) {
        const targetRow = pickRandom(candidateRows, random);
        addSmallPiece(grid, targetCol, targetRow, 'blocking', random, symmetry, minBlockingSpacing);
        return;
      }
    }
  }

  // Fallback: find any valid position
  for (let attempt = 0; attempt < 50; attempt++) {
    const col = randomInt(2, GRID_COLUMNS - 3, random);
    const row = randomInt(2, GRID_ROWS - 3, random);

    if (
      grid[col][row].terrain === 'open' &&
      isValidBlockingPosition(col, row, blockingPositions, minBlockingSpacing)
    ) {
      addSmallPiece(grid, col, row, 'blocking', random, symmetry, minBlockingSpacing);
      return;
    }
  }

  // Last resort: add cover-difficult instead to avoid tight passages
  for (let attempt = 0; attempt < 20; attempt++) {
    const col = randomInt(2, GRID_COLUMNS - 3, random);
    const row = randomInt(2, GRID_ROWS - 3, random);
    if (grid[col][row].terrain === 'open') {
      addSmallPiece(grid, col, row, 'cover-difficult', random, symmetry, 0);
      return;
    }
  }
}

/**
 * Add a small piece (3-6 hexes) at the specified location.
 * When symmetry is enabled, mirrors the piece to the opposite half.
 * Respects minimum spacing from existing terrain.
 * For blocking terrain, also respects minimum spacing from other blocking terrain.
 */
function addSmallPiece(
  grid: HexGrid,
  startCol: number,
  startRow: number,
  terrainType: TerrainType,
  random: () => number,
  symmetry: boolean = false,
  minBlockingSpacing: number = 0
): void {
  const occupied = new Set<string>();
  const isBlocking = terrainType === 'blocking';
  const blockingPositions: Array<{ col: number; row: number }> = [];

  // Mark existing terrain and a buffer zone around it
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[col][row].terrain !== 'open') {
        occupied.add(hexKey(col, row));
        if (grid[col][row].terrain === 'blocking') {
          blockingPositions.push({ col, row });
        }
      }
    }
  }

  // If start position is occupied or too close to blocking, find a nearby open spot
  let validStart = !occupied.has(hexKey(startCol, startRow));
  if (validStart && isBlocking && minBlockingSpacing > 0) {
    validStart = isValidBlockingPosition(startCol, startRow, blockingPositions, minBlockingSpacing);
  }

  if (!validStart) {
    let found = false;
    for (let radius = 1; radius <= 5 && !found; radius++) {
      for (let dc = -radius; dc <= radius && !found; dc++) {
        for (let dr = -radius; dr <= radius && !found; dr++) {
          const nc = startCol + dc;
          const nr = startRow + dr;
          if (!isValidCoord(nc, nr)) continue;
          if (occupied.has(hexKey(nc, nr))) continue;
          if (
            isBlocking &&
            minBlockingSpacing > 0 &&
            !isValidBlockingPosition(nc, nr, blockingPositions, minBlockingSpacing)
          )
            continue;
          startCol = nc;
          startRow = nr;
          found = true;
        }
      }
    }
    if (!found) return;
  }

  // Grow the piece, but for blocking terrain, only add hexes that maintain spacing
  const size = randomInt(NUDGE_PIECE_SIZE.min, NUDGE_PIECE_SIZE.max, random);

  if (isBlocking && minBlockingSpacing > 0) {
    // Custom growth for blocking terrain that respects spacing
    const piece = new Set<string>();
    piece.add(hexKey(startCol, startRow));
    const frontier = [{ col: startCol, row: startRow }];

    while (piece.size < size && frontier.length > 0) {
      const idx = Math.floor(random() * frontier.length);
      const current = frontier[idx];
      const neighbors = shuffleArray([...getValidNeighbors(current.col, current.row)], random);

      let added = false;
      for (const neighbor of neighbors) {
        if (piece.size >= size) break;
        const nKey = hexKey(neighbor.col, neighbor.row);
        if (occupied.has(nKey) || piece.has(nKey)) continue;
        if (grid[neighbor.col][neighbor.row].terrain !== 'open') continue;

        // Check blocking spacing for this hex
        if (
          !isValidBlockingPosition(
            neighbor.col,
            neighbor.row,
            blockingPositions,
            minBlockingSpacing
          )
        )
          continue;

        piece.add(nKey);
        frontier.push(neighbor);
        added = true;
      }

      if (!added) frontier.splice(idx, 1);
    }

    // Apply the piece
    for (const key of piece) {
      const [col, row] = key.split(',').map(Number);
      grid[col][row].terrain = terrainType;

      if (symmetry) {
        const mirrorRow = GRID_ROWS - 1 - row;
        if (mirrorRow !== row && grid[col][mirrorRow].terrain === 'open') {
          // Check mirror position spacing too
          if (isValidBlockingPosition(col, mirrorRow, blockingPositions, minBlockingSpacing)) {
            grid[col][mirrorRow].terrain = terrainType;
          }
        }
      }
    }
  } else {
    // Regular growth for non-blocking terrain
    const piece = growPiece(grid, startCol, startRow, size, occupied, random);

    for (const key of piece) {
      const [col, row] = key.split(',').map(Number);
      grid[col][row].terrain = terrainType;

      if (symmetry) {
        const mirrorRow = GRID_ROWS - 1 - row;
        if (mirrorRow !== row && grid[col][mirrorRow].terrain === 'open') {
          grid[col][mirrorRow].terrain = terrainType;
        }
      }
    }
  }
}

/**
 * Try to remove or shrink a blocking piece to improve min passage.
 */
function nudgeRemoveBlockingPiece(grid: HexGrid, random: () => number, symmetry: boolean): void {
  // Find blocking hexes
  const blockingHexes: Array<{ col: number; row: number }> = [];

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const props = TERRAIN_PROPERTIES[grid[col][row].terrain];
      if (props.blocking || props.impassable) {
        blockingHexes.push({ col, row });
      }
    }
  }

  if (blockingHexes.length === 0) return;

  // Remove a random blocking hex (simple approach)
  const toRemove = pickRandom(blockingHexes, random);
  grid[toRemove.col][toRemove.row].terrain = 'open';

  // Mirror if symmetry enabled
  if (symmetry) {
    const mirrorRow = GRID_ROWS - 1 - toRemove.row;
    if (mirrorRow !== toRemove.row) {
      grid[toRemove.col][mirrorRow].terrain = 'open';
    }
  }
}

/**
 * Remove terrain to reduce coverage.
 * Smart removal: checks current stats and avoids removing terrain types that are already low.
 */
function nudgeRemoveTerrain(grid: HexGrid, random: () => number, symmetry: boolean): void {
  // First, calculate current terrain composition to make smart decisions
  let terrainCount = 0;
  let blockingCount = 0;
  let coverCount = 0;
  let difficultCount = 0;
  let dangerousCount = 0;

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const terrain = grid[col][row].terrain;
      if (terrain === 'open') continue;
      terrainCount++;
      const props = TERRAIN_PROPERTIES[terrain];
      if (props.blocking) blockingCount++;
      if (props.cover) coverCount++;
      if (props.difficult) difficultCount++;
      if (props.dangerous) dangerousCount++;
    }
  }

  // Calculate current percentages
  const blockingPct = terrainCount > 0 ? blockingCount / terrainCount : 0;
  const coverPct = terrainCount > 0 ? coverCount / terrainCount : 0;
  const difficultPct = terrainCount > 0 ? difficultCount / terrainCount : 0;

  // Find removable hexes with smart priority based on current stats
  const removableHexes: Array<{ col: number; row: number; priority: number }> = [];

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const terrain = grid[col][row].terrain;
      if (terrain === 'open') continue;

      const props = TERRAIN_PROPERTIES[terrain];

      // Assign priority (higher = more likely to remove)
      // Smart: protect terrain types that are already below target
      let priority = 1;

      if (props.dangerous) {
        // Protect dangerous if we have fewer than minimum, otherwise remove excess
        priority = dangerousCount <= MIN_DANGEROUS_PROTECT ? 0.2 : 3;
      } else if (props.blocking) {
        // Protect blocking if below threshold, otherwise allow removal
        priority = blockingPct > BLOCKING_TARGET_HIGH ? 1.5 : 0.3;
      } else if (props.cover && props.difficult) {
        // cover-difficult: protect if either is low
        const needsCover = coverPct < PROTECTION_THRESHOLD;
        const needsDifficult = difficultPct < PROTECTION_THRESHOLD;
        if (needsCover && needsDifficult) priority = 0.2;
        else if (needsCover || needsDifficult) priority = 0.5;
        else priority = 2;
      } else if (props.cover) {
        // Protect cover if below threshold
        priority = coverPct < PROTECTION_THRESHOLD ? 0.3 : 2;
      } else if (props.difficult) {
        // Protect difficult if below threshold
        priority = difficultPct < PROTECTION_THRESHOLD ? 0.3 : 2;
      }

      removableHexes.push({ col, row, priority });
    }
  }

  if (removableHexes.length === 0) return;

  // Weight selection by priority
  const totalPriority = removableHexes.reduce((sum, h) => sum + h.priority, 0);
  let roll = random() * totalPriority;

  for (const hex of removableHexes) {
    roll -= hex.priority;
    if (roll <= 0) {
      grid[hex.col][hex.row].terrain = 'open';
      grid[hex.col][hex.row].elevation = 0;

      // Mirror if symmetry enabled
      if (symmetry) {
        const mirrorRow = GRID_ROWS - 1 - hex.row;
        if (mirrorRow !== hex.row) {
          grid[hex.col][mirrorRow].terrain = 'open';
          grid[hex.col][mirrorRow].elevation = 0;
        }
      }
      return;
    }
  }
}

// =============================================================================
// PHASE 4: ENHANCEMENTS (Symmetry, Elevation)
// =============================================================================

/**
 * Mirror terrain from top half to bottom half for competitive balance.
 */
function applySymmetry(grid: HexGrid): void {
  const midRow = Math.floor(GRID_ROWS / 2);

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < midRow; row++) {
      const mirrorRow = GRID_ROWS - 1 - row;
      const srcHex = grid[col][row];
      if (srcHex.terrain !== 'open') {
        grid[col][mirrorRow].terrain = srcHex.terrain;
        grid[col][mirrorRow].elevation = srcHex.elevation;
      }
    }
  }
}

/**
 * Add elevation variation to the map.
 */
function addElevation(grid: HexGrid, config: GeneratorConfig, random: () => number): void {
  if (!config.elevation.enabled) return;

  const { maxLevel, intensity } = config.elevation;
  const numClusters = Math.floor(
    ELEVATION_CLUSTER_COUNT_BASE + intensity * ELEVATION_CLUSTER_COUNT_MULTIPLIER
  );

  const rowMax = config.symmetry ? Math.floor(GRID_ROWS / 2) - 1 : GRID_ROWS - 4;

  for (let i = 0; i < numClusters; i++) {
    const col = randomInt(3, GRID_COLUMNS - 4, random);
    const row = randomInt(3, rowMax, random);
    const hex = grid[col][row];
    const props = TERRAIN_PROPERTIES[hex.terrain];

    if (props.blocking || props.impassable) continue;

    let level: number;
    const roll = random();
    if (roll < ELEVATION_PROB_HIGH && maxLevel >= 3) {
      level = randomInt(3, maxLevel, random);
    } else if (roll < ELEVATION_PROB_MID && maxLevel >= 2) {
      level = 2;
    } else if (roll < ELEVATION_PROB_LOW) {
      level = 1;
    } else {
      level = -1;
    }

    growElevationCluster(
      grid,
      col,
      row,
      level,
      Math.floor(ELEVATION_CLUSTER_SIZE_BASE + intensity * ELEVATION_CLUSTER_SIZE_MULTIPLIER),
      random,
      config.symmetry
    );
  }

  // Mirror elevation if symmetry enabled
  if (config.symmetry) {
    const midRow = Math.floor(GRID_ROWS / 2);
    for (let col = 0; col < GRID_COLUMNS; col++) {
      for (let row = 0; row < midRow; row++) {
        if (grid[col][row].elevation !== 0) {
          const mirrorRow = GRID_ROWS - 1 - row;
          const mirrorHex = grid[col][mirrorRow];
          const props = TERRAIN_PROPERTIES[mirrorHex.terrain];
          if (!props.blocking && !props.impassable) {
            mirrorHex.elevation = grid[col][row].elevation;
          }
        }
      }
    }
  }

  // Add scatter elevation
  const scatterChance = ELEVATION_SCATTER_BASE + intensity * ELEVATION_SCATTER_MULTIPLIER;
  const scatterRowMax = config.symmetry ? Math.floor(GRID_ROWS / 2) : GRID_ROWS;

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < scatterRowMax; row++) {
      const hex = grid[col][row];
      const props = TERRAIN_PROPERTIES[hex.terrain];
      if (props.blocking || props.impassable || hex.elevation !== 0) continue;

      if (chance(scatterChance, random)) {
        hex.elevation = chance(SCATTER_RISE_PROBABILITY, random) ? 1 : -1;
        if (config.symmetry) {
          const mirrorRow = GRID_ROWS - 1 - row;
          const mirrorHex = grid[col][mirrorRow];
          const mirrorProps = TERRAIN_PROPERTIES[mirrorHex.terrain];
          if (!mirrorProps.blocking && !mirrorProps.impassable) {
            mirrorHex.elevation = hex.elevation;
          }
        }
      }
    }
  }

  validateElevationRamps(grid, random);
}

function growElevationCluster(
  grid: HexGrid,
  startCol: number,
  startRow: number,
  level: number,
  targetSize: number,
  random: () => number,
  symmetry: boolean
): void {
  const visited = new Set<string>();
  const frontier = [{ col: startCol, row: startRow }];
  grid[startCol][startRow].elevation = level;
  visited.add(hexKey(startCol, startRow));

  const rowMax = symmetry ? Math.floor(GRID_ROWS / 2) - 1 : GRID_ROWS - 1;

  while (visited.size < targetSize && frontier.length > 0) {
    const idx = Math.floor(random() * frontier.length);
    const current = frontier[idx];
    const neighbors = shuffleArray([...getValidNeighbors(current.col, current.row)], random);

    let added = false;
    for (const n of neighbors) {
      if (n.row > rowMax) continue;
      const key = hexKey(n.col, n.row);
      if (visited.has(key)) continue;

      const hex = grid[n.col][n.row];
      const props = TERRAIN_PROPERTIES[hex.terrain];
      if (props.blocking || props.impassable) continue;

      hex.elevation = level;
      visited.add(key);
      frontier.push(n);
      added = true;
      break;
    }

    if (!added) frontier.splice(idx, 1);
  }
}

function validateElevationRamps(grid: HexGrid, random: () => number): void {
  // Ensure high elevations have ramps down
  for (let targetLevel = 4; targetLevel >= 2; targetLevel--) {
    for (let col = 0; col < GRID_COLUMNS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const hex = grid[col][row];
        if (hex.elevation !== targetLevel) continue;

        const neighbors = getValidNeighbors(col, row);
        const hasRamp = neighbors.some((n) => grid[n.col][n.row].elevation === targetLevel - 1);

        if (!hasRamp) {
          const candidates = neighbors.filter((n) => {
            const nHex = grid[n.col][n.row];
            const props = TERRAIN_PROPERTIES[nHex.terrain];
            return !props.blocking && !props.impassable && nHex.elevation < targetLevel;
          });

          if (candidates.length > 0) {
            const chosen = pickRandom(candidates, random);
            grid[chosen.col][chosen.row].elevation = targetLevel - 1;
          }
        }
      }
    }
  }

  // Ensure deep depressions have ramps up
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const hex = grid[col][row];
      if (hex.elevation !== -2) continue;

      const neighbors = getValidNeighbors(col, row);
      const hasRamp = neighbors.some((n) => grid[n.col][n.row].elevation === -1);

      if (!hasRamp) {
        const candidates = neighbors.filter((n) => {
          const nHex = grid[n.col][n.row];
          const props = TERRAIN_PROPERTIES[nHex.terrain];
          return !props.blocking && !props.impassable && nHex.elevation > -2;
        });

        if (candidates.length > 0) {
          const chosen = pickRandom(candidates, random);
          grid[chosen.col][chosen.row].elevation = -1;
        }
      }
    }
  }
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate a single map candidate.
 */
function generateCandidate(config: GeneratorConfig, seed: string): HexGrid {
  const random = createSeededRandom(seed);
  const grid = createEmptyGrid();

  // Calculate how many pieces to place based on density
  // OPR recommends 15-20 pieces for a 6'x4' table, so 7-10 for half-size
  // Target: ~216 hexes (25%) with ~16 hex avg pieces = ~13-14 pieces
  // But we want 7-10 distinct clusters, so aim for fewer larger pieces
  const basePieces = BASE_PIECES + Math.round(config.density * PIECES_PER_DENSITY);
  const targetPieces = config.symmetry ? Math.ceil(basePieces / 2) : basePieces;

  // Build terrain weights from config
  const terrainWeights: { type: TerrainType; weight: number }[] = [];

  if (config.terrainMix.blocking > 0) {
    terrainWeights.push({ type: 'blocking', weight: config.terrainMix.blocking });
  }
  if (config.terrainMix.impassable > 0) {
    terrainWeights.push({ type: 'impassable', weight: config.terrainMix.impassable });
  }
  if (config.terrainMix.cover > 0 && config.terrainMix.difficult > 0) {
    // Prefer combined types when both are wanted
    terrainWeights.push({
      type: 'cover-difficult',
      weight: (config.terrainMix.cover + config.terrainMix.difficult) / 2,
    });
    terrainWeights.push({ type: 'cover', weight: config.terrainMix.cover / 2 });
    terrainWeights.push({ type: 'difficult', weight: config.terrainMix.difficult / 2 });
  } else {
    if (config.terrainMix.cover > 0) {
      terrainWeights.push({ type: 'cover', weight: config.terrainMix.cover });
    }
    if (config.terrainMix.difficult > 0) {
      terrainWeights.push({ type: 'difficult', weight: config.terrainMix.difficult });
    }
  }
  if (config.terrainMix.dangerous > 0) {
    terrainWeights.push({ type: 'dangerous', weight: config.terrainMix.dangerous });
    terrainWeights.push({ type: 'cover-dangerous', weight: config.terrainMix.dangerous / 2 });
  }

  // Fallback if no weights
  if (terrainWeights.length === 0) {
    terrainWeights.push({ type: 'cover-difficult', weight: 1 });
  }

  // Calculate spacing based on spread setting
  // spread 0 = tight (spacing 2), spread 1 = scattered (spacing 4)
  // Minimum spacing of 2 ensures terrain pieces don't touch
  const minSpacing = Math.round(2 + config.spread * 2);

  // Edge buffer: 0 if disabled, EDGE_BUFFER_SIZE if enabled
  const edgeBuffer = config.edgeBuffer ? EDGE_BUFFER_SIZE : 0;

  const sizeRange = getPieceSizeRange(config.pieceSize);
  const scatterConfig = {
    targetPieces,
    sizeRange,
    terrainWeights,
    minSpacing,
    minBlockingSpacing: config.minPassage + 1, // +1 because we measure edge-to-edge
    edgeBuffer,
    halfOnly: config.symmetry ? ('top' as const) : undefined,
  };

  // For large pieces, force terrain variety to ensure compliance
  // Large pieces mean fewer total pieces, so random selection often misses required terrain types
  const isLargePieces = config.pieceSize >= PIECE_SIZE_THRESHOLD_LARGE;

  if (isLargePieces) {
    // Force at least one of each critical terrain type before random scatter
    // Only include terrain types that are enabled (not "off")
    const forcedTypes: TerrainType[] = [];
    if (config.terrainMix.blocking > 0) {
      forcedTypes.push('blocking', 'blocking');
    }
    if (config.terrainMix.cover > 0 || config.terrainMix.difficult > 0) {
      forcedTypes.push('cover-difficult', 'cover-difficult');
    }
    if (config.terrainMix.dangerous > 0) {
      forcedTypes.push('dangerous');
    }

    const remainingPieces = Math.max(0, targetPieces - forcedTypes.length);

    // Forced pieces use medium size to ensure they fit and leave room for variety
    const forcedSizeRange = FORCED_PIECE_SIZE;

    for (const terrainType of forcedTypes) {
      scatterTerrain(
        grid,
        {
          ...scatterConfig,
          targetPieces: 1,
          sizeRange: forcedSizeRange,
          terrainWeights: [{ type: terrainType, weight: 1 }],
        },
        random
      );
    }

    // Fill remaining with random terrain using the configured large size
    if (remainingPieces > 0) {
      scatterTerrain(
        grid,
        {
          ...scatterConfig,
          targetPieces: remainingPieces,
        },
        random
      );
    }
  } else {
    // Normal scatter for small/medium pieces
    scatterTerrain(grid, scatterConfig, random);
  }

  // Apply symmetry before nudging (so nudges apply to full map)
  if (config.symmetry) {
    applySymmetry(grid);
  }

  // Phase 2 & 3: Measure and nudge
  const losCorridorWidth = losStrictnessToCorridorWidth(config.losStrictness);
  const minBlockingSpacing = config.minPassage + 1; // +1 for edge-to-edge measurement
  nudgeTowardCompliance(
    grid,
    random,
    config.terrainMix,
    MAX_NUDGE_ITERATIONS,
    config.symmetry,
    losCorridorWidth,
    minBlockingSpacing
  );

  // Phase 4: Add elevation
  addElevation(grid, config, random);

  return grid;
}

/**
 * Main entry point: Generate a map with retry logic for default settings.
 */
export function generateMap(config: GeneratorConfig): HexGrid {
  const useStrictCompliance = isDefaultConfig(config);
  const maxAttempts = useStrictCompliance ? 5 : 1;
  const losCorridorWidth = losStrictnessToCorridorWidth(config.losStrictness);

  let bestGrid: HexGrid | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Vary the seed slightly for each attempt
    const attemptSeed = attempt === 0 ? config.seed : `${config.seed}_${attempt}`;
    const grid = generateCandidate(config, attemptSeed);
    const stats = calculateMapStats(grid, losCorridorWidth);

    // Score the map (higher is better)
    const score = scoreMap(stats);

    if (score > bestScore) {
      bestScore = score;
      bestGrid = grid;
    }

    // If compliant, we're done
    if (isOPRCompliant(stats)) {
      return grid;
    }
  }

  return bestGrid || createEmptyGrid();
}

/**
 * Score a map based on how well it meets OPR guidelines.
 * Higher score = better compliance.
 */
function scoreMap(stats: MapStats): number {
  let score = 0;

  // Coverage: target 25%+
  if (stats.coverage >= 0.25) score += 10;
  else score += stats.coverage * 40; // Partial credit

  // Blocking: target 50%+
  if (stats.blockingPercent >= 0.5) score += 10;
  else score += stats.blockingPercent * 20;

  // Cover: target 33%+
  if (stats.coverPercent >= 0.33) score += 10;
  else score += stats.coverPercent * 30;

  // Difficult: target 33%+
  if (stats.difficultPercent >= 0.33) score += 10;
  else score += stats.difficultPercent * 30;

  // Dangerous: target 2+
  if (stats.dangerousCount >= 2) score += 10;
  else score += stats.dangerousCount * 5;

  // LOS blocked: critical
  if (stats.losBlocked) score += 20;

  // Max gap: target ≤12
  if (stats.maxGap <= 12) score += 10;
  else score -= (stats.maxGap - 12) * 2;

  // Min passage: target ≥6
  if (stats.minPassage >= 6) score += 10;
  else score += stats.minPassage; // Partial credit

  return score;
}
