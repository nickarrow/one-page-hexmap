/**
 * Procedural hex map generator following OPR terrain placement guidelines.
 *
 * Design Philosophy:
 * Generate terrain PIECES (not individual hexes) with proper spacing,
 * then validate the result meets OPR guidelines.
 *
 * OPR Guidelines (from rulebook):
 * - 15-20 terrain pieces on a 6'x4' table (8-12 for our half-scale)
 * - Pieces should cover ~25% of table when combined
 * - Minimum 6" gap between pieces (for unit passage)
 * - Maximum 12" gap (no huge empty zones)
 * - 50% of pieces should block LOS
 * - 33% should provide cover
 * - 33% should be difficult
 * - 2 pieces should be dangerous
 * - No clear edge-to-edge sightlines
 */

import type { GeneratorConfig, HexJSON, HexData, TerrainType } from '../types';
import { TERRAIN_TYPES, getPlaceableTerrains, getTerrainLabel } from './terrainPresets';
import { createSeededRandom, randomInt, pickRandom, shuffleArray } from './random';
import { coordToLabel, hexId, getValidNeighbors, hexDistance } from './hexmath';
import { MIN_PASSAGE_HEXES, MAX_TERRAIN_GAP_HEXES } from './constants';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Target number of terrain pieces for half-scale table (8-10 base, scaled by density) */
const PIECE_COUNT = { MIN: 6, MAX: 12 } as const;

/** Margin from map edges for initial placement */
const EDGE_MARGIN = 2;

// =============================================================================
// TYPES
// =============================================================================

interface PlacedPiece {
  id: string;
  terrainId: string;
  hexes: Set<string>;
  centerQ: number;
  centerR: number;
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

export function generateMap(config: GeneratorConfig): HexJSON {
  const random = createSeededRandom(config.seed);
  const { columns, rows } = config;

  // Initialize empty grid
  const hexes = initializeGrid(columns, rows);

  // Get all placeable terrain types
  const availableTerrains = getPlaceableTerrains();

  // Calculate how many pieces to place based on density
  const targetPieceCount = Math.round(
    PIECE_COUNT.MIN + config.density * (PIECE_COUNT.MAX - PIECE_COUNT.MIN)
  );

  // Determine terrain mix (how many of each type)
  const terrainList = selectTerrainMix(availableTerrains, targetPieceCount, config, random);

  // Place terrain pieces with spacing constraints
  const placedPieces = placeTerrainPieces(
    hexes,
    terrainList,
    columns,
    rows,
    config.pieceSize,
    random
  );

  // Collect all occupied hexes for validation
  const occupiedHexes = new Set<string>();
  for (const piece of placedPieces) {
    for (const hId of piece.hexes) {
      occupiedHexes.add(hId);
    }
  }

  // Validate and fix: no gaps larger than 12 hexes
  fillLargeGaps(hexes, occupiedHexes, columns, rows, random);

  // Validate and fix LOS (add blockers if needed)
  ensureNoEdgeToEdgeLOS(hexes, occupiedHexes, columns, rows, random);

  // Add elevation if enabled
  if (config.elevationEnabled) {
    addElevation(hexes, placedPieces, columns, rows, config, random);
  }

  // Update tooltips
  updateHexTooltips(hexes);

  return { layout: 'odd-q', hexes };
}

// =============================================================================
// GRID INITIALIZATION
// =============================================================================

function initializeGrid(columns: number, rows: number): Record<string, HexData> {
  const hexes: Record<string, HexData> = {};
  for (let q = 0; q < columns; q++) {
    for (let r = 0; r < rows; r++) {
      const id = hexId(q, r);
      hexes[id] = {
        q,
        r,
        n: coordToLabel(q, r),
        terrain: 'open',
        elevation: 0,
      };
    }
  }
  return hexes;
}

// =============================================================================
// TERRAIN SELECTION
// =============================================================================

/**
 * Select terrain types to meet OPR mix requirements:
 * - 50% blocking LOS
 * - 33% cover
 * - 33% difficult
 * - At least 2 dangerous (if enabled)
 */
function selectTerrainMix(
  available: TerrainType[],
  count: number,
  config: GeneratorConfig,
  random: () => number
): TerrainType[] {
  const result: TerrainType[] = [];

  // Calculate required counts
  const blockingNeeded = Math.ceil(count * config.terrainMix.blocking);
  const coverNeeded = Math.ceil(count * config.terrainMix.cover);
  const difficultNeeded = Math.ceil(count * config.terrainMix.difficult);
  const dangerousNeeded =
    config.terrainMix.dangerous > 0
      ? Math.max(2, Math.ceil(count * config.terrainMix.dangerous))
      : 0;

  // Categorize available terrain by properties
  const blocking = available.filter((t) => t.properties.blocking);
  const impassableOnly = available.filter((t) => t.properties.impassable && !t.properties.blocking);
  const coverTerrains = available.filter((t) => t.properties.cover && !t.properties.blocking);
  const difficultTerrains = available.filter((t) => t.properties.difficult && !t.properties.blocking);
  const dangerousTerrains = available.filter((t) => t.properties.dangerous);

  // Add blocking terrain first (most important for gameplay)
  // Mix in some impassable-only for variety (10% of blocking slots)
  for (let i = 0; i < blockingNeeded; i++) {
    if (impassableOnly.length > 0 && random() < 0.1) {
      result.push(pickRandom(impassableOnly, random));
    } else if (blocking.length > 0) {
      result.push(pickRandom(blocking, random));
    }
  }

  // Add cover terrain
  addFromCategory(result, coverTerrains, coverNeeded, random);

  // Add difficult terrain
  addFromCategory(result, difficultTerrains, difficultNeeded, random);

  // Add dangerous terrain
  if (dangerousNeeded > 0 && dangerousTerrains.length > 0) {
    addFromCategory(result, dangerousTerrains, dangerousNeeded, random);
  }

  // Fill remaining slots with random terrain (excluding blocking/impassable)
  const fillTerrains = available.filter((t) => !t.properties.blocking && !t.properties.impassable);
  while (result.length < count && fillTerrains.length > 0) {
    result.push(pickRandom(fillTerrains, random));
  }

  // Shuffle and trim to exact count
  return shuffleArray(result, random).slice(0, count);
}

function addFromCategory(
  result: TerrainType[],
  category: TerrainType[],
  count: number,
  random: () => number
): void {
  if (category.length === 0) return;
  for (let i = 0; i < count; i++) {
    result.push(pickRandom(category, random));
  }
}

// =============================================================================
// TERRAIN PLACEMENT
// =============================================================================

/**
 * Place terrain pieces with minimum spacing between them.
 */
function placeTerrainPieces(
  hexes: Record<string, HexData>,
  terrainList: TerrainType[],
  columns: number,
  rows: number,
  pieceSize: number,
  random: () => number
): PlacedPiece[] {
  const placed: PlacedPiece[] = [];
  const occupiedHexes = new Set<string>();

  for (const terrain of terrainList) {
    // Find a valid placement position
    const position = findValidPosition(columns, rows, occupiedHexes, placed, random);

    if (!position) continue; // Skip if no valid position found

    // Determine piece size based on pieceSize config
    const sizeRange = getTerrainSizeRange(pieceSize);
    const targetSize = randomInt(sizeRange.min, sizeRange.max, random);

    // Grow the piece from the center (organic shape for all terrain now)
    const pieceHexes = growPiece(
      position.q,
      position.r,
      targetSize,
      columns,
      rows,
      occupiedHexes,
      random
    );

    if (pieceHexes.size < sizeRange.min) continue; // Too small, skip

    // Apply terrain to hexes
    for (const hId of pieceHexes) {
      hexes[hId].terrain = terrain.id;
      hexes[hId].class = `terrain-${terrain.id}`;
      occupiedHexes.add(hId);
    }

    placed.push({
      id: `piece-${placed.length}`,
      terrainId: terrain.id,
      hexes: pieceHexes,
      centerQ: position.q,
      centerR: position.r,
    });
  }

  return placed;
}

/**
 * Find a position that maintains minimum spacing from existing terrain.
 */
function findValidPosition(
  columns: number,
  rows: number,
  occupied: Set<string>,
  placed: PlacedPiece[],
  random: () => number
): { q: number; r: number } | null {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const q = randomInt(EDGE_MARGIN, columns - EDGE_MARGIN - 1, random);
    const r = randomInt(EDGE_MARGIN, rows - EDGE_MARGIN - 1, random);
    const id = hexId(q, r);

    // Check if hex is already occupied
    if (occupied.has(id)) continue;

    // Check minimum distance from all placed pieces
    let tooClose = false;
    for (const piece of placed) {
      const dist = hexDistance(q, r, piece.centerQ, piece.centerR);
      if (dist < MIN_PASSAGE_HEXES) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      return { q, r };
    }
  }

  return null;
}

/**
 * Get appropriate size range for terrain, scaled by pieceSize config.
 */
function getTerrainSizeRange(pieceSize: number): { min: number; max: number } {
  // Base sizes scaled by pieceSize (0.2 to 1.0)
  // At pieceSize=0.5: min ~15, max ~30
  // At pieceSize=0.2: min ~6, max ~15
  // At pieceSize=1.0: min ~25, max ~45
  const baseMin = 6 + Math.round(pieceSize * 25);
  const baseMax = 15 + Math.round(pieceSize * 35);

  return {
    min: Math.max(4, Math.round(baseMin * 0.7)),
    max: baseMax,
  };
}

/**
 * Grow a terrain piece from a center point (organic shape).
 */
function growPiece(
  centerQ: number,
  centerR: number,
  targetSize: number,
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): Set<string> {
  const piece = new Set<string>();
  const centerId = hexId(centerQ, centerR);

  if (occupied.has(centerId)) return piece;

  piece.add(centerId);

  const frontier = [{ q: centerQ, r: centerR }];
  const maxAttempts = targetSize * 5;
  let attempts = 0;

  while (piece.size < targetSize && frontier.length > 0 && attempts < maxAttempts) {
    attempts++;
    const current = frontier[Math.floor(random() * frontier.length)];
    const neighbors = shuffleArray(getValidNeighbors(current.q, current.r, columns, rows), random);

    for (const neighbor of neighbors) {
      if (piece.size >= targetSize) break;

      const nId = hexId(neighbor.q, neighbor.r);
      if (occupied.has(nId) || piece.has(nId)) continue;

      // Keep piece roughly compact
      const distFromCenter = hexDistance(centerQ, centerR, neighbor.q, neighbor.r);
      const maxDist = Math.ceil(Math.sqrt(targetSize)) + 2;
      if (distFromCenter > maxDist) continue;

      piece.add(nId);
      frontier.push(neighbor);
    }
  }

  return piece;
}


// =============================================================================
// GAP VALIDATION
// =============================================================================

/**
 * Find and fill gaps larger than MAX_TERRAIN_GAP_HEXES (12 hexes).
 * OPR: "no gaps bigger than 12" between different terrain pieces"
 */
function fillLargeGaps(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  random: () => number
): void {
  const checked = new Set<string>();

  for (let q = 0; q < columns; q++) {
    for (let r = 0; r < rows; r++) {
      const id = hexId(q, r);
      if (checked.has(id) || occupied.has(id)) continue;

      // Measure this open area
      const gap = measureOpenArea(hexes, q, r, columns, rows, checked);

      if (gap.maxExtent > MAX_TERRAIN_GAP_HEXES) {
        // Add terrain to fill the gap - use cover terrain
        addGapFiller(hexes, occupied, gap.centerQ, gap.centerR, columns, rows, random);
      }
    }
  }
}

/**
 * Measure the extent of a connected open area using BFS.
 */
function measureOpenArea(
  hexes: Record<string, HexData>,
  startQ: number,
  startR: number,
  columns: number,
  rows: number,
  checked: Set<string>
): { maxExtent: number; centerQ: number; centerR: number } {
  const frontier = [{ q: startQ, r: startR }];
  let minQ = startQ,
    maxQ = startQ;
  let minR = startR,
    maxR = startR;
  let count = 0;
  const maxSearch = 150;

  while (frontier.length > 0 && count < maxSearch) {
    const current = frontier.shift()!;
    const id = hexId(current.q, current.r);

    if (checked.has(id)) continue;
    checked.add(id);

    const hex = hexes[id];
    if (!hex || hex.terrain !== 'open') continue;

    count++;
    minQ = Math.min(minQ, current.q);
    maxQ = Math.max(maxQ, current.q);
    minR = Math.min(minR, current.r);
    maxR = Math.max(maxR, current.r);

    for (const n of getValidNeighbors(current.q, current.r, columns, rows)) {
      const nId = hexId(n.q, n.r);
      if (!checked.has(nId)) {
        frontier.push(n);
      }
    }
  }

  return {
    maxExtent: Math.max(maxQ - minQ, maxR - minR),
    centerQ: Math.floor((minQ + maxQ) / 2),
    centerR: Math.floor((minR + maxR) / 2),
  };
}

/**
 * Add a small terrain piece to fill a large gap.
 */
function addGapFiller(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  centerQ: number,
  centerR: number,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Find an open hex at or near center
  let q = centerQ;
  let r = centerR;
  const id = hexId(q, r);

  if (occupied.has(id) || hexes[id]?.terrain !== 'open') {
    const neighbors = getValidNeighbors(q, r, columns, rows);
    const open = neighbors.find((n) => {
      const nId = hexId(n.q, n.r);
      return !occupied.has(nId) && hexes[nId]?.terrain === 'open';
    });
    if (!open) return;
    q = open.q;
    r = open.r;
  }

  // Use cover terrain for gap fillers (provides gameplay value without blocking LOS)
  const terrainId = 'cover';

  // Place small cluster (3-4 hexes)
  const targetId = hexId(q, r);
  hexes[targetId].terrain = terrainId;
  hexes[targetId].class = `terrain-${terrainId}`;
  occupied.add(targetId);

  const neighbors = shuffleArray(getValidNeighbors(q, r, columns, rows), random);
  let added = 0;
  for (const n of neighbors) {
    if (added >= 3) break;
    const nId = hexId(n.q, n.r);
    if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
      hexes[nId].terrain = terrainId;
      hexes[nId].class = `terrain-${terrainId}`;
      occupied.add(nId);
      added++;
    }
  }
}

// =============================================================================
// LOS VALIDATION
// =============================================================================

/**
 * Ensure no clear line of sight from deployment edge to deployment edge.
 * Only BLOCKING terrain blocks LOS - cover/difficult/dangerous do NOT.
 */
function ensureNoEdgeToEdgeLOS(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Check each column for LOS blockers (prevents top-to-bottom sightlines)
  // We check every 3 columns to ensure good coverage without over-blocking
  for (let q = 2; q < columns - 2; q += 3) {
    if (!columnHasLOSBlocker(hexes, q, rows)) {
      // Place blocker at a random vertical position (not too close to edges)
      const r = randomInt(4, rows - 5, random);
      addLOSBlocker(hexes, occupied, q, r, columns, rows, random);
    }
  }
}

/**
 * Check if a column has any LOS-blocking terrain.
 * Only terrain with properties.blocking = true blocks LOS.
 */
function columnHasLOSBlocker(hexes: Record<string, HexData>, q: number, rows: number): boolean {
  for (let r = 0; r < rows; r++) {
    const hex = hexes[hexId(q, r)];
    if (hex && hex.terrain !== 'open') {
      const terrainType = TERRAIN_TYPES[hex.terrain];
      if (terrainType?.properties.blocking) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Add a small LOS-blocking terrain piece at the specified position.
 */
function addLOSBlocker(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  targetQ: number,
  targetR: number,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Use blocking terrain
  const terrainId = 'blocking';

  // Search for open hex near target position
  for (let offset = 0; offset <= 4; offset++) {
    for (const dR of [0, offset, -offset]) {
      for (const dQ of [0, offset, -offset]) {
        const q = targetQ + dQ;
        const r = targetR + dR;
        if (q < 2 || q >= columns - 2 || r < 2 || r >= rows - 2) continue;

        const id = hexId(q, r);
        if (!occupied.has(id) && hexes[id]?.terrain === 'open') {
          // Place small cluster (2-3 hexes)
          hexes[id].terrain = terrainId;
          hexes[id].class = `terrain-${terrainId}`;
          occupied.add(id);

          // Add 1-2 adjacent hexes
          const neighbors = shuffleArray(getValidNeighbors(q, r, columns, rows), random);
          let added = 0;
          for (const n of neighbors) {
            if (added >= 2) break;
            const nId = hexId(n.q, n.r);
            if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
              hexes[nId].terrain = terrainId;
              hexes[nId].class = `terrain-${terrainId}`;
              occupied.add(nId);
              added++;
            }
          }
          return;
        }
      }
    }
  }
}


// =============================================================================
// ELEVATION SYSTEM
// =============================================================================

function addElevation(
  hexes: Record<string, HexData>,
  _pieces: PlacedPiece[],
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  const maxElev = config.elevationMax;
  const intensity = config.elevationIntensity;

  // Add dramatic elevation features based on intensity
  addElevationFeatures(hexes, columns, rows, maxElev, intensity, random);

  // CRITICAL: Validate all elevation has proper ramps (climbable paths)
  validateElevationRamps(hexes, columns, rows, random);
}

/**
 * Add dramatic elevation features: plateaus, ridges, trenches, cliffs.
 */
function addElevationFeatures(
  hexes: Record<string, HexData>,
  columns: number,
  rows: number,
  maxElev: number,
  intensity: number,
  random: () => number
): void {
  // =========================================================================
  // PLATEAUS - Large elevated areas at max or near-max elevation
  // =========================================================================
  if (intensity > 0.3 && maxElev >= 2) {
    const numPlateaus = Math.floor(1 + intensity * 3);

    for (let i = 0; i < numPlateaus; i++) {
      const q = randomInt(4, columns - 5, random);
      const r = randomInt(4, rows - 5, random);
      const hex = hexes[hexId(q, r)];

      if (hex && hex.terrain === 'open' && hex.elevation === 0) {
        const plateauElev =
          intensity > 0.7 ? maxElev : Math.max(2, Math.floor(maxElev * (0.5 + intensity * 0.5)));

        const plateauSize = Math.floor(5 + intensity * 10);
        const plateauHexes = growElevationCluster(
          hexes,
          q,
          r,
          plateauElev,
          plateauSize,
          columns,
          rows,
          random
        );

        addClusterRamps(hexes, plateauHexes, plateauElev, columns, rows, random);
      }
    }
  }

  // =========================================================================
  // RIDGES - Linear elevated features
  // =========================================================================
  if (intensity > 0.4 && maxElev >= 2) {
    const numRidges = Math.floor(intensity * 2);

    for (let i = 0; i < numRidges; i++) {
      const startQ = randomInt(3, columns - 4, random);
      const startR = randomInt(3, rows - 4, random);
      const hex = hexes[hexId(startQ, startR)];

      if (hex && hex.terrain === 'open' && hex.elevation === 0) {
        const ridgeElev = Math.max(2, Math.floor(maxElev * (0.6 + intensity * 0.4)));
        const ridgeLength = Math.floor(6 + intensity * 8);

        growRidge(hexes, startQ, startR, ridgeElev, ridgeLength, columns, rows, random);
      }
    }
  }

  // =========================================================================
  // TRENCHES - Deep depressions (-1 to -2)
  // =========================================================================
  if (intensity > 0.4) {
    const numTrenches = Math.floor(intensity * 3);

    for (let i = 0; i < numTrenches; i++) {
      const q = randomInt(4, columns - 5, random);
      const r = randomInt(4, rows - 5, random);
      const hex = hexes[hexId(q, r)];

      if (hex && hex.terrain === 'open' && hex.elevation === 0) {
        const trenchDepth = intensity > 0.7 ? -2 : -1;
        const trenchSize = Math.floor(3 + intensity * 6);

        growElevationCluster(hexes, q, r, trenchDepth, trenchSize, columns, rows, random);
      }
    }
  }

  // =========================================================================
  // SCATTERED ELEVATION - Individual hex variations
  // =========================================================================
  const scatterChance = 0.02 + intensity * 0.08;

  for (const hex of Object.values(hexes)) {
    if (hex.terrain === 'open' && hex.elevation === 0 && random() < scatterChance) {
      if (random() < 0.7) {
        hex.elevation = 1;
      } else if (intensity > 0.5 && maxElev >= 2 && random() < 0.5) {
        hex.elevation = 2;
      } else {
        hex.elevation = -1;
      }
    }
  }

  // =========================================================================
  // SMALL ELEVATION CLUSTERS
  // =========================================================================
  const numSmallClusters = Math.floor(2 + intensity * 6);

  for (let i = 0; i < numSmallClusters; i++) {
    const q = randomInt(3, columns - 4, random);
    const r = randomInt(3, rows - 4, random);
    const hex = hexes[hexId(q, r)];

    if (hex && hex.terrain === 'open' && hex.elevation === 0) {
      let clusterElev: number;
      const roll = random();

      if (roll < 0.5) {
        clusterElev = 1;
      } else if (roll < 0.75 && maxElev >= 2) {
        clusterElev = 2;
      } else if (roll < 0.9 && maxElev >= 3 && intensity > 0.6) {
        clusterElev = 3;
      } else if (maxElev >= 4 && intensity > 0.8) {
        clusterElev = 4;
      } else {
        clusterElev = -1;
      }

      const clusterSize = Math.floor(2 + intensity * 4);
      const clusterHexes = growElevationCluster(
        hexes,
        q,
        r,
        clusterElev,
        clusterSize,
        columns,
        rows,
        random
      );

      if (clusterElev >= 2) {
        addClusterRamps(hexes, clusterHexes, clusterElev, columns, rows, random);
      }
    }
  }
}

/**
 * Grow an elevation cluster organically from a starting point.
 */
function growElevationCluster(
  hexes: Record<string, HexData>,
  startQ: number,
  startR: number,
  elevation: number,
  targetSize: number,
  columns: number,
  rows: number,
  random: () => number
): Set<string> {
  const cluster = new Set<string>();
  const startId = hexId(startQ, startR);

  hexes[startId].elevation = elevation;
  cluster.add(startId);

  const frontier = [{ q: startQ, r: startR }];

  while (cluster.size < targetSize && frontier.length > 0) {
    const idx = Math.floor(random() * frontier.length);
    const current = frontier[idx];
    const neighbors = shuffleArray(getValidNeighbors(current.q, current.r, columns, rows), random);

    let added = false;
    for (const n of neighbors) {
      const nId = hexId(n.q, n.r);
      const nHex = hexes[nId];

      if (nHex && nHex.terrain === 'open' && nHex.elevation === 0 && !cluster.has(nId)) {
        nHex.elevation = elevation;
        cluster.add(nId);
        frontier.push(n);
        added = true;
        break;
      }
    }

    if (!added) {
      frontier.splice(idx, 1);
    }
  }

  return cluster;
}

/**
 * Grow a linear ridge feature.
 */
function growRidge(
  hexes: Record<string, HexData>,
  startQ: number,
  startR: number,
  elevation: number,
  length: number,
  columns: number,
  rows: number,
  random: () => number
): void {
  const direction = randomInt(0, 5, random);
  let q = startQ;
  let r = startR;

  for (let i = 0; i < length; i++) {
    const id = hexId(q, r);
    const hex = hexes[id];

    if (!hex || hex.terrain !== 'open') break;
    if (hex.elevation !== 0 && hex.elevation !== elevation) break;

    hex.elevation = elevation;

    const neighbors = getValidNeighbors(q, r, columns, rows);
    for (const n of neighbors) {
      if (random() < 0.3) {
        const nHex = hexes[hexId(n.q, n.r)];
        if (nHex && nHex.terrain === 'open' && nHex.elevation === 0) {
          nHex.elevation = elevation;
        }
      }
    }

    const nextDir = (direction + randomInt(-1, 1, random) + 6) % 6;
    const validNeighbors = getValidNeighbors(q, r, columns, rows);
    if (validNeighbors.length === 0) break;

    const next = validNeighbors[nextDir % validNeighbors.length];
    q = next.q;
    r = next.r;
  }
}

/**
 * Add ramp hexes around an elevated cluster.
 */
function addClusterRamps(
  hexes: Record<string, HexData>,
  cluster: Set<string>,
  clusterElev: number,
  columns: number,
  rows: number,
  random: () => number
): void {
  const adjacent: Array<{ id: string; q: number; r: number }> = [];

  for (const hId of cluster) {
    const hex = hexes[hId];
    for (const n of getValidNeighbors(hex.q, hex.r, columns, rows)) {
      const nId = hexId(n.q, n.r);
      if (!cluster.has(nId) && hexes[nId]?.terrain === 'open' && hexes[nId]?.elevation === 0) {
        adjacent.push({ id: nId, q: n.q, r: n.r });
      }
    }
  }

  const unique = [...new Map(adjacent.map((a) => [a.id, a])).values()];
  const shuffled = shuffleArray(unique, random);
  const numRamps = Math.min(shuffled.length, Math.floor(cluster.size * 0.5) + 1);

  for (let i = 0; i < numRamps; i++) {
    const rampElev = Math.max(1, clusterElev - 1);
    hexes[shuffled[i].id].elevation = rampElev;

    if (clusterElev >= 3 && i < numRamps / 2) {
      const rampNeighbors = getValidNeighbors(shuffled[i].q, shuffled[i].r, columns, rows);
      for (const rn of rampNeighbors) {
        const rnId = hexId(rn.q, rn.r);
        if (hexes[rnId]?.terrain === 'open' && hexes[rnId]?.elevation === 0 && random() < 0.4) {
          hexes[rnId].elevation = Math.max(1, rampElev - 1);
          break;
        }
      }
    }
  }
}

/**
 * Validate that all elevated hexes have proper ramp access.
 */
function validateElevationRamps(
  hexes: Record<string, HexData>,
  columns: number,
  rows: number,
  random: () => number
): void {
  for (let targetElev = 4; targetElev >= 2; targetElev--) {
    for (const hex of Object.values(hexes)) {
      if (hex.elevation !== targetElev) continue;

      const neighbors = getValidNeighbors(hex.q, hex.r, columns, rows);
      const hasRamp = neighbors.some((n) => {
        const nHex = hexes[hexId(n.q, n.r)];
        return nHex && nHex.elevation === targetElev - 1;
      });

      if (!hasRamp) {
        const candidates = neighbors.filter((n) => {
          const nHex = hexes[hexId(n.q, n.r)];
          if (!nHex) return false;
          const terrainType = TERRAIN_TYPES[nHex.terrain];
          if (terrainType?.properties.impassable) return false;
          if (nHex.elevation >= targetElev) return false;
          return true;
        });

        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(random() * candidates.length)];
          const chosenHex = hexes[hexId(chosen.q, chosen.r)];
          chosenHex.elevation = targetElev - 1;
        }
      }
    }
  }

  // Validate negative elevations
  for (const hex of Object.values(hexes)) {
    if (hex.elevation !== -2) continue;

    const neighbors = getValidNeighbors(hex.q, hex.r, columns, rows);
    const hasRamp = neighbors.some((n) => {
      const nHex = hexes[hexId(n.q, n.r)];
      return nHex && nHex.elevation === -1;
    });

    if (!hasRamp) {
      const candidates = neighbors.filter((n) => {
        const nHex = hexes[hexId(n.q, n.r)];
        if (!nHex) return false;
        const terrainType = TERRAIN_TYPES[nHex.terrain];
        if (terrainType?.properties.impassable) return false;
        if (nHex.elevation <= -2) return false;
        return true;
      });

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(random() * candidates.length)];
        hexes[hexId(chosen.q, chosen.r)].elevation = -1;
      }
    }
  }
}

// =============================================================================
// TOOLTIPS
// =============================================================================

function updateHexTooltips(hexes: Record<string, HexData>): void {
  for (const hex of Object.values(hexes)) {
    const label = getTerrainLabel(hex.terrain);
    const parts: string[] = [label];

    if (hex.elevation !== 0) {
      const sign = hex.elevation > 0 ? '+' : '';
      parts.push(`Elev ${sign}${hex.elevation}`);
    }

    parts.push(coordToLabel(hex.q, hex.r));
    hex.n = parts.join(' | ');

    // Build CSS class string
    const classes: string[] = [];

    if (hex.terrain !== 'open') {
      classes.push(`terrain-${hex.terrain}`);
    }

    if (hex.elevation > 0) {
      classes.push(`elev-${hex.elevation}`);
    } else if (hex.elevation < 0) {
      classes.push(`elev-neg-${Math.abs(hex.elevation)}`);
    }

    hex.class = classes.join(' ') || undefined;
  }
}
