/**
 * Procedural hex map generator following OPR terrain placement guidelines.
 */

import type { HexGrid, TerrainType, GeneratorConfig } from './types';
import { TERRAIN_PROPERTIES } from './types';
import {
  GRID_COLUMNS,
  GRID_ROWS,
  TOTAL_HEXES,
  PIECE_SIZE_SMALL,
  PIECE_SIZE_MEDIUM,
  PIECE_SIZE_LARGE,
} from './constants';
import { createSeededRandom, randomInt, pickRandom, shuffleArray, chance } from './random';
import { getValidNeighbors, hexDistance, hexKey, isValidCoord } from './hexUtils';

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

interface TerrainBudget {
  totalHexes: number;
  blockingHexes: number;
  impassableHexes: number;
  coverHexes: number;
  difficultHexes: number;
  dangerousHexes: number;
}

function calculateTerrainBudget(config: GeneratorConfig): TerrainBudget {
  // Density now has full range effect:
  // 0.0 = ~10% coverage (sparse)
  // 0.5 = ~25% coverage (default/OPR minimum)
  // 1.0 = ~40% coverage (dense)
  const targetCoverage = 0.1 + config.density * 0.3;
  const totalHexes = Math.round(TOTAL_HEXES * targetCoverage);

  // Dangerous is special: OPR guideline is "2+ clusters", not a percentage
  const dangerousHexes =
    config.terrainMix.dangerous > 0 ? Math.round(6 + config.terrainMix.dangerous * 20) : 0;

  return {
    totalHexes,
    blockingHexes: Math.round(totalHexes * config.terrainMix.blocking),
    impassableHexes: Math.round(totalHexes * config.terrainMix.impassable),
    coverHexes: Math.round(totalHexes * config.terrainMix.cover),
    difficultHexes: Math.round(totalHexes * config.terrainMix.difficult),
    dangerousHexes,
  };
}

function getPieceSizeRange(pieceSize: number): { min: number; max: number } {
  if (pieceSize < 0.33) return PIECE_SIZE_SMALL;
  if (pieceSize < 0.66) return PIECE_SIZE_MEDIUM;
  return PIECE_SIZE_LARGE;
}

function getMinSpacing(clusterSpacing: number, pieceCount: number): number {
  // Base spacing from slider: 1 (tight) to 6 (spread out)
  const baseSpacing = Math.round(1 + clusterSpacing * 5);
  // Reduce spacing as we place more pieces to ensure we can fit them
  if (pieceCount > 15) return Math.max(1, baseSpacing - 2);
  if (pieceCount > 8) return Math.max(1, baseSpacing - 1);
  return baseSpacing;
}

function findValidPosition(
  grid: HexGrid,
  occupied: Set<string>,
  random: () => number,
  minSpacing: number,
  halfOnly?: 'top' | 'bottom'
): { col: number; row: number } | null {
  const rowMin = halfOnly === 'bottom' ? Math.floor(GRID_ROWS / 2) : 1;
  const rowMax = halfOnly === 'top' ? Math.floor(GRID_ROWS / 2) - 1 : GRID_ROWS - 2;

  for (let attempt = 0; attempt < 200; attempt++) {
    const col = randomInt(1, GRID_COLUMNS - 2, random);
    const row = randomInt(rowMin, rowMax, random);
    const key = hexKey(col, row);
    if (occupied.has(key) || grid[col][row].terrain !== 'open') continue;

    let tooClose = false;
    for (let dc = -minSpacing; dc <= minSpacing && !tooClose; dc++) {
      for (let dr = -minSpacing; dr <= minSpacing && !tooClose; dr++) {
        const nc = col + dc;
        const nr = row + dr;
        if (!isValidCoord(nc, nr)) continue;
        if (grid[nc][nr].terrain !== 'open') {
          if (hexDistance(col, row, nc, nr) < minSpacing) tooClose = true;
        }
      }
    }
    if (!tooClose) return { col, row };
  }

  // Fallback: find any open position
  for (let attempt = 0; attempt < 100; attempt++) {
    const col = randomInt(0, GRID_COLUMNS - 1, random);
    const row = randomInt(rowMin, rowMax, random);
    if (!occupied.has(hexKey(col, row)) && grid[col][row].terrain === 'open') {
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
  halfOnly?: 'top' | 'bottom'
): Set<string> {
  const piece = new Set<string>();
  const startKey = hexKey(startCol, startRow);
  if (occupied.has(startKey) || grid[startCol][startRow].terrain !== 'open') return piece;

  const rowMin = halfOnly === 'bottom' ? Math.floor(GRID_ROWS / 2) : 0;
  const rowMax = halfOnly === 'top' ? Math.floor(GRID_ROWS / 2) - 1 : GRID_ROWS - 1;

  piece.add(startKey);
  const frontier = [{ col: startCol, row: startRow }];

  while (piece.size < targetSize && frontier.length > 0) {
    const idx = Math.floor(random() * frontier.length);
    const current = frontier[idx];
    const neighbors = shuffleArray([...getValidNeighbors(current.col, current.row)], random);

    let added = false;
    for (const neighbor of neighbors) {
      if (piece.size >= targetSize) break;
      // Respect half-only constraint for symmetry
      if (neighbor.row < rowMin || neighbor.row > rowMax) continue;

      const nKey = hexKey(neighbor.col, neighbor.row);
      if (occupied.has(nKey) || piece.has(nKey)) continue;
      if (grid[neighbor.col][neighbor.row].terrain !== 'open') continue;

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

function applyTerrain(
  grid: HexGrid,
  hexes: Set<string>,
  terrain: TerrainType,
  occupied: Set<string>
): void {
  for (const key of hexes) {
    const [col, row] = key.split(',').map(Number);
    grid[col][row].terrain = terrain;
    occupied.add(key);
  }
}

function mirrorTerrain(grid: HexGrid, occupied: Set<string>): void {
  // Mirror top half to bottom half (horizontal axis of symmetry)
  // Deployment is along long edges (top/bottom), so players face each other vertically
  const midRow = Math.floor(GRID_ROWS / 2);

  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < midRow; row++) {
      const mirrorRow = GRID_ROWS - 1 - row;
      const srcHex = grid[col][row];
      if (srcHex.terrain !== 'open') {
        grid[col][mirrorRow].terrain = srcHex.terrain;
        grid[col][mirrorRow].elevation = srcHex.elevation;
        occupied.add(hexKey(col, mirrorRow));
      }
    }
  }
}

function selectTerrainType(
  needsBlocking: boolean,
  needsImpassable: boolean,
  needsCover: boolean,
  needsDifficult: boolean,
  needsDangerous: boolean,
  random: () => number
): TerrainType {
  if (needsBlocking && chance(0.6, random)) return 'blocking';
  if (needsImpassable && chance(0.5, random)) return 'impassable';
  if (needsCover && needsDifficult && needsDangerous && chance(0.15, random))
    return 'cover-difficult-dangerous';
  if (needsCover && needsDifficult && chance(0.4, random)) return 'cover-difficult';
  if (needsCover && needsDangerous && chance(0.3, random)) return 'cover-dangerous';
  if (needsDifficult && needsDangerous && chance(0.3, random)) return 'difficult-dangerous';
  if (needsCover && chance(0.5, random)) return 'cover';
  if (needsDifficult && chance(0.5, random)) return 'difficult';
  if (needsDangerous && chance(0.4, random)) return 'dangerous';
  if (needsBlocking) return 'blocking';
  if (needsImpassable) return 'impassable';
  if (needsCover) return chance(0.5, random) ? 'cover' : 'cover-difficult';
  if (needsDifficult) return 'difficult';
  if (needsDangerous) return 'dangerous';
  return 'cover-difficult';
}

function ensureLOSBlocking(
  grid: HexGrid,
  occupied: Set<string>,
  random: () => number,
  strict: boolean
): void {
  // Block LOS from top to bottom (deployment edges)
  // Strategic rows divide the map into quarters vertically
  const strategicRows = [6, 12, 18]; // Roughly quarters of the 24-row grid
  const requiredCount = strict ? 3 : 2; // Strict = all 3, Relaxed = any 2

  let blockedCount = 0;
  const unblockedRows: number[] = [];

  for (const row of strategicRows) {
    let hasBlocker = false;
    for (let col = 0; col < GRID_COLUMNS; col++) {
      if (grid[col][row].terrain === 'blocking') {
        hasBlocker = true;
        break;
      }
    }
    if (hasBlocker) {
      blockedCount++;
    } else {
      unblockedRows.push(row);
    }
  }

  // Add blocking terrain to meet requirement
  const needed = requiredCount - blockedCount;
  for (let i = 0; i < needed && i < unblockedRows.length; i++) {
    const row = unblockedRows[i];
    const col = randomInt(6, GRID_COLUMNS - 7, random);
    const piece = growPiece(grid, col, row, randomInt(4, 8, random), occupied, random);
    if (piece.size > 0) {
      applyTerrain(grid, piece, 'blocking', occupied);
    } else {
      // Fallback: force place blocking hex somewhere in this row
      // Try multiple positions across the row
      let placed = false;
      for (let attempt = 0; attempt < 10 && !placed; attempt++) {
        const tryCol = randomInt(0, GRID_COLUMNS - 1, random);
        const key = hexKey(tryCol, row);
        if (!occupied.has(key) && grid[tryCol][row].terrain === 'open') {
          grid[tryCol][row].terrain = 'blocking';
          occupied.add(key);
          placed = true;
        }
      }
      // Last resort: overwrite any non-blocking terrain in this row
      if (!placed) {
        for (let c = 0; c < GRID_COLUMNS; c++) {
          if (grid[c][row].terrain !== 'blocking') {
            grid[c][row].terrain = 'blocking';
            occupied.add(hexKey(c, row));
            break;
          }
        }
      }
    }
  }
}

function addElevation(grid: HexGrid, config: GeneratorConfig, random: () => number): void {
  if (!config.elevation.enabled) return;
  const { maxLevel, intensity } = config.elevation;
  const numClusters = Math.floor(3 + intensity * 8);

  // For symmetry, only place on top half then mirror
  const rowMax = config.symmetry ? Math.floor(GRID_ROWS / 2) - 1 : GRID_ROWS - 4;

  for (let i = 0; i < numClusters; i++) {
    const col = randomInt(3, GRID_COLUMNS - 4, random);
    const row = randomInt(3, rowMax, random);
    const hex = grid[col][row];
    const props = TERRAIN_PROPERTIES[hex.terrain];
    if (props.blocking || props.impassable) continue;

    let level: number;
    const roll = random();
    if (roll < 0.1 && maxLevel >= 3) level = randomInt(3, maxLevel, random);
    else if (roll < 0.3 && maxLevel >= 2) level = 2;
    else if (roll < 0.7) level = 1;
    else level = -1;

    growElevationCluster(
      grid,
      col,
      row,
      level,
      Math.floor(3 + intensity * 6),
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

  const scatterChance = 0.02 + intensity * 0.05;
  const scatterRowMax = config.symmetry ? Math.floor(GRID_ROWS / 2) : GRID_ROWS;
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < scatterRowMax; row++) {
      const hex = grid[col][row];
      const props = TERRAIN_PROPERTIES[hex.terrain];
      if (props.blocking || props.impassable || hex.elevation !== 0) continue;
      if (chance(scatterChance, random)) {
        hex.elevation = chance(0.7, random) ? 1 : -1;
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
      if (n.row > rowMax) continue; // Respect symmetry boundary
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

export function generateMap(config: GeneratorConfig): HexGrid {
  const random = createSeededRandom(config.seed);
  const grid = createEmptyGrid();
  const occupied = new Set<string>();

  const budget = calculateTerrainBudget(config);
  const sizeRange = getPieceSizeRange(config.pieceSize);

  let placedBlocking = 0;
  let placedImpassable = 0;
  let placedCover = 0;
  let placedDifficult = 0;
  let placedDangerous = 0;
  let totalPlaced = 0;
  let pieceCount = 0;

  // For symmetry, we place on top half only, then mirror
  const halfOnly = config.symmetry ? ('top' as const) : undefined;
  const targetTotal = config.symmetry ? Math.ceil(budget.totalHexes / 2) : budget.totalHexes;

  while (totalPlaced < targetTotal && pieceCount < 50) {
    pieceCount++;
    const needsBlocking =
      placedBlocking < (config.symmetry ? budget.blockingHexes / 2 : budget.blockingHexes);
    const needsImpassable =
      placedImpassable < (config.symmetry ? budget.impassableHexes / 2 : budget.impassableHexes);
    const needsCover = placedCover < (config.symmetry ? budget.coverHexes / 2 : budget.coverHexes);
    const needsDifficult =
      placedDifficult < (config.symmetry ? budget.difficultHexes / 2 : budget.difficultHexes);
    const needsDangerous =
      placedDangerous < (config.symmetry ? budget.dangerousHexes / 2 : budget.dangerousHexes);

    const terrain = selectTerrainType(
      needsBlocking,
      needsImpassable,
      needsCover,
      needsDifficult,
      needsDangerous,
      random
    );
    const spacing = getMinSpacing(config.clusterSpacing, pieceCount);
    const position = findValidPosition(grid, occupied, random, spacing, halfOnly);
    if (!position) continue;

    const targetSize = randomInt(sizeRange.min, sizeRange.max, random);
    const piece = growPiece(
      grid,
      position.col,
      position.row,
      targetSize,
      occupied,
      random,
      halfOnly
    );
    if (piece.size === 0) continue;

    applyTerrain(grid, piece, terrain, occupied);

    const props = TERRAIN_PROPERTIES[terrain];
    if (props.blocking) placedBlocking += piece.size;
    if (props.impassable && !props.blocking) placedImpassable += piece.size;
    if (props.cover) placedCover += piece.size;
    if (props.difficult) placedDifficult += piece.size;
    if (props.dangerous) placedDangerous += piece.size;
    totalPlaced += piece.size;
  }

  // Mirror terrain if symmetry enabled
  if (config.symmetry) {
    mirrorTerrain(grid, occupied);
  }

  ensureLOSBlocking(grid, occupied, random, config.strictLOS);
  addElevation(grid, config, random);

  return grid;
}
