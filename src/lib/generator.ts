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

import type { GeneratorConfig, HexJSON, HexData, TerrainPreset } from '../types';
import { TERRAIN_PRESETS, getPlaceableTerrainsFiltered } from './terrainPresets';
import { THEME_TERRAIN_IDS } from './presets';
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

  // Get available terrain types for this theme
  const availableTerrains = getPlaceableTerrainsFiltered(THEME_TERRAIN_IDS[config.theme]);

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
  fillLargeGaps(hexes, occupiedHexes, columns, rows, availableTerrains, random);

  // Validate and fix LOS (add blockers if needed)
  ensureNoEdgeToEdgeLOS(hexes, occupiedHexes, columns, rows, availableTerrains, random);

  // Add elevation if enabled
  if (config.elevationEnabled) {
    addElevation(hexes, placedPieces, columns, rows, config, random);
  }

  // Update tooltips
  updateHexTooltips(hexes);

  // Debug: Log generation stats
  logGenerationStats(hexes, placedPieces, columns, rows, config);

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
  available: TerrainPreset[],
  count: number,
  config: GeneratorConfig,
  random: () => number
): TerrainPreset[] {
  const result: TerrainPreset[] = [];

  // Calculate required counts
  const blockingNeeded = Math.ceil(count * config.terrainMix.blocking);
  const coverNeeded = Math.ceil(count * config.terrainMix.cover);
  const difficultNeeded = Math.ceil(count * config.terrainMix.difficult);
  const dangerousNeeded = config.terrainMix.dangerous > 0 
    ? Math.max(2, Math.ceil(count * config.terrainMix.dangerous))
    : 0;

  // Categorize available terrain
  const blocking = available.filter(t => t.losType === 'blocking' || t.losType === 'partial');
  const coverOnly = available.filter(t => t.properties.cover && t.losType === 'clear');
  const difficultOnly = available.filter(t => t.properties.difficult && !t.properties.cover && t.losType === 'clear');
  const dangerous = available.filter(t => t.properties.dangerous === true);

  // Add blocking terrain first (most important for gameplay)
  addFromCategory(result, blocking, blockingNeeded, random);

  // Add cover terrain (that isn't already blocking)
  addFromCategory(result, coverOnly, coverNeeded, random);

  // Add difficult terrain
  addFromCategory(result, difficultOnly, difficultNeeded, random);

  // Add dangerous terrain
  if (dangerousNeeded > 0 && dangerous.length > 0) {
    addFromCategory(result, dangerous, dangerousNeeded, random);
  }

  // Fill remaining slots with random terrain
  while (result.length < count) {
    result.push(pickRandom(available, random));
  }

  // Shuffle and trim to exact count
  return shuffleArray(result, random).slice(0, count);
}

function addFromCategory(
  result: TerrainPreset[],
  category: TerrainPreset[],
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
  terrainList: TerrainPreset[],
  columns: number,
  rows: number,
  pieceSize: number,
  random: () => number
): PlacedPiece[] {
  const placed: PlacedPiece[] = [];
  const occupiedHexes = new Set<string>();

  for (const terrain of terrainList) {
    // Find a valid placement position
    const position = findValidPosition(
      columns,
      rows,
      occupiedHexes,
      placed,
      random
    );

    if (!position) continue; // Skip if no valid position found

    // Determine piece size based on terrain type and pieceSize config
    const sizeRange = getTerrainSizeRange(terrain, pieceSize);
    const targetSize = randomInt(sizeRange.min, sizeRange.max, random);

    // Grow the piece from the center
    const pieceHexes = growPiece(
      position.q,
      position.r,
      targetSize,
      terrain.shape,
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
 * Get appropriate size range for a terrain type, scaled by pieceSize config.
 * 
 * To hit ~25% coverage with 9 pieces on 864 hexes, we need ~24 hexes per piece average.
 * pieceSize=0.5 (default) should give roughly this.
 * pieceSize=0.2 gives smaller pieces (~10 hex avg)
 * pieceSize=1.0 gives larger pieces (~35 hex avg)
 */
function getTerrainSizeRange(terrain: TerrainPreset, pieceSize: number): { min: number; max: number } {
  // Base sizes scaled by pieceSize (0.2 to 1.0)
  // At pieceSize=0.5: min ~15, max ~30
  // At pieceSize=0.2: min ~6, max ~15  
  // At pieceSize=1.0: min ~25, max ~45
  const baseMin = 6 + Math.round(pieceSize * 25);
  const baseMax = 15 + Math.round(pieceSize * 35);
  
  // Adjust based on terrain's natural cluster size preference
  const preset = terrain.clusterSize;
  const terrainScale = (preset.min + preset.max) / 10; // Normalize around 1.0
  
  return {
    min: Math.max(4, Math.round(baseMin * terrainScale * 0.7)),
    max: Math.round(baseMax * terrainScale),
  };
}

/**
 * Grow a terrain piece from a center point.
 */
function growPiece(
  centerQ: number,
  centerR: number,
  targetSize: number,
  shape: string,
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): Set<string> {
  const piece = new Set<string>();
  const centerId = hexId(centerQ, centerR);

  if (occupied.has(centerId)) return piece;

  piece.add(centerId);

  if (shape === 'linear') {
    growLinear(piece, centerQ, centerR, targetSize, columns, rows, occupied, random);
  } else {
    growOrganic(piece, centerQ, centerR, targetSize, columns, rows, occupied, random);
  }

  return piece;
}

function growLinear(
  piece: Set<string>,
  startQ: number,
  startR: number,
  targetSize: number,
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): void {
  const direction = randomInt(0, 5, random);
  let currentQ = startQ;
  let currentR = startR;

  while (piece.size < targetSize) {
    const neighbors = getValidNeighbors(currentQ, currentR, columns, rows);
    if (neighbors.length === 0) break;

    const next = neighbors[direction % neighbors.length];
    const nextId = hexId(next.q, next.r);

    if (occupied.has(nextId) || piece.has(nextId)) break;

    piece.add(nextId);
    currentQ = next.q;
    currentR = next.r;
  }
}

function growOrganic(
  piece: Set<string>,
  centerQ: number,
  centerR: number,
  targetSize: number,
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): void {
  const frontier = [{ q: centerQ, r: centerR }];
  const maxAttempts = targetSize * 5;
  let attempts = 0;

  while (piece.size < targetSize && frontier.length > 0 && attempts < maxAttempts) {
    attempts++;
    const current = frontier[Math.floor(random() * frontier.length)];
    const neighbors = shuffleArray(
      getValidNeighbors(current.q, current.r, columns, rows),
      random
    );

    for (const neighbor of neighbors) {
      if (piece.size >= targetSize) break;

      const nId = hexId(neighbor.q, neighbor.r);
      if (occupied.has(nId) || piece.has(nId)) continue;

      // Keep piece roughly compact but allow for larger pieces
      const distFromCenter = hexDistance(centerQ, centerR, neighbor.q, neighbor.r);
      const maxDist = Math.ceil(Math.sqrt(targetSize)) + 2;
      if (distFromCenter > maxDist) continue;

      piece.add(nId);
      frontier.push(neighbor);
    }
  }
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
  available: TerrainPreset[],
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
        // Add terrain to fill the gap
        addGapFiller(hexes, occupied, gap.centerQ, gap.centerR, columns, rows, available, random);
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
  let minQ = startQ, maxQ = startQ;
  let minR = startR, maxR = startR;
  let count = 0;
  const maxSearch = 150; // Limit search to prevent performance issues

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
  available: TerrainPreset[],
  random: () => number
): void {
  // Find an open hex at or near center
  let q = centerQ;
  let r = centerR;
  const id = hexId(q, r);

  if (occupied.has(id) || hexes[id]?.terrain !== 'open') {
    // Find nearby open hex
    const neighbors = getValidNeighbors(q, r, columns, rows);
    const open = neighbors.find(n => {
      const nId = hexId(n.q, n.r);
      return !occupied.has(nId) && hexes[nId]?.terrain === 'open';
    });
    if (!open) return;
    q = open.q;
    r = open.r;
  }

  // Pick a cover terrain (not blocking, to avoid over-blocking the map)
  const coverTerrains = available.filter(t => t.properties.cover && !t.properties.blocking);
  const terrain = coverTerrains.length > 0 
    ? pickRandom(coverTerrains, random) 
    : pickRandom(available, random);

  // Place small cluster (3-4 hexes)
  const targetId = hexId(q, r);
  hexes[targetId].terrain = terrain.id;
  hexes[targetId].class = `terrain-${terrain.id}`;
  occupied.add(targetId);

  const neighbors = shuffleArray(getValidNeighbors(q, r, columns, rows), random);
  let added = 0;
  for (const n of neighbors) {
    if (added >= 3) break;
    const nId = hexId(n.q, n.r);
    if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
      hexes[nId].terrain = terrain.id;
      hexes[nId].class = `terrain-${terrain.id}`;
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
 * Deployment is along top/bottom (36-hex sides), so we check COLUMNS for blockers.
 * Each column should have at least one LOS-blocking piece to prevent north-south sightlines.
 */
function ensureNoEdgeToEdgeLOS(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  available: TerrainPreset[],
  random: () => number
): void {
  // Check each column for LOS blockers (prevents top-to-bottom sightlines)
  // We check every 3 columns to ensure good coverage without over-blocking
  for (let q = 2; q < columns - 2; q += 3) {
    if (!columnHasLOSBlocker(hexes, q, rows)) {
      // Place blocker at a random vertical position (not too close to edges)
      const r = randomInt(4, rows - 5, random);
      addLOSBlocker(hexes, occupied, q, r, columns, rows, available, random);
    }
  }
}


function columnHasLOSBlocker(hexes: Record<string, HexData>, q: number, rows: number): boolean {
  for (let r = 0; r < rows; r++) {
    const hex = hexes[hexId(q, r)];
    if (hex && hex.terrain !== 'open') {
      const preset = TERRAIN_PRESETS[hex.terrain];
      if (preset && (preset.losType === 'blocking' || preset.losType === 'partial')) {
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
  available: TerrainPreset[],
  random: () => number
): void {
  // Find a blocking terrain type
  const blockers = available.filter(t => t.losType === 'blocking' || t.losType === 'partial');
  if (blockers.length === 0) return;

  const terrain = pickRandom(blockers, random);

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
          hexes[id].terrain = terrain.id;
          hexes[id].class = `terrain-${terrain.id}`;
          occupied.add(id);

          // Add 1-2 adjacent hexes
          const neighbors = shuffleArray(getValidNeighbors(q, r, columns, rows), random);
          let added = 0;
          for (const n of neighbors) {
            if (added >= 2) break;
            const nId = hexId(n.q, n.r);
            if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
              hexes[nId].terrain = terrain.id;
              hexes[nId].class = `terrain-${terrain.id}`;
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
  pieces: PlacedPiece[],
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  const maxElev = config.elevationMax;
  const intensity = config.elevationIntensity;

  // Apply base elevation to terrain with inherent elevation (hills, mountains, etc.)
  for (const piece of pieces) {
    const preset = TERRAIN_PRESETS[piece.terrainId];
    if (!preset?.baseElevation) continue;

    // Scale terrain elevation based on intensity and max
    let elev = preset.baseElevation;
    
    // At high intensity, boost terrain elevation toward max
    if (intensity > 0.6 && elev < maxElev) {
      elev = Math.min(elev + Math.floor(intensity * 2), maxElev);
    }
    
    elev = Math.min(elev, maxElev);
    if (elev <= 0) continue;

    // Set elevation for all hexes in piece
    for (const hId of piece.hexes) {
      hexes[hId].elevation = elev;
    }

    // Special handling for towers - add rubble/ruins ramps
    if (preset.id === 'tower') {
      createTowerRamps(hexes, piece, elev, columns, rows, random);
    } else if (elev >= 2) {
      // Create standard ramps for other elevated terrain
      createElevationRamps(hexes, piece, elev, columns, rows, random);
    }

    // Add peaks to large terrain pieces at high intensity
    if (piece.hexes.size >= 5 && maxElev > elev && intensity > 0.5 && random() < intensity) {
      const centerHex = hexes[hexId(piece.centerQ, piece.centerR)];
      if (centerHex && piece.hexes.has(hexId(piece.centerQ, piece.centerR))) {
        centerHex.elevation = Math.min(elev + 1, maxElev);
      }
    }
  }

  // Ensure all towers have elevation (in case baseElevation wasn't applied)
  ensureTowerElevation(hexes, pieces, maxElev, intensity);

  // Add dramatic elevation features based on intensity
  addElevationFeatures(hexes, columns, rows, maxElev, intensity, random);
  
  // CRITICAL: Validate all elevation has proper ramps (climbable paths)
  validateElevationRamps(hexes, columns, rows, random);
}

/**
 * Ensure all tower hexes have elevation - towers should never be at ground level.
 * Scans both pieces AND individual hexes to catch all towers.
 */
function ensureTowerElevation(
  hexes: Record<string, HexData>,
  pieces: PlacedPiece[],
  maxElev: number,
  intensity: number
): void {
  const minTowerElev = Math.min(2 + Math.floor(intensity), maxElev);
  
  // First pass: handle tower pieces
  for (const piece of pieces) {
    if (piece.terrainId !== 'tower') continue;
    
    for (const hId of piece.hexes) {
      const hex = hexes[hId];
      if (hex && hex.elevation < minTowerElev) {
        hex.elevation = minTowerElev;
      }
    }
  }
  
  // Second pass: scan ALL hexes for tower terrain (catches any we missed)
  for (const hex of Object.values(hexes)) {
    if (hex.terrain === 'tower' && hex.elevation < minTowerElev) {
      hex.elevation = minTowerElev;
    }
  }
}

/**
 * Create ramps for towers using rubble/ruins terrain.
 * Towers need adjacent lower-elevation hexes that units can climb.
 */
function createTowerRamps(
  hexes: Record<string, HexData>,
  piece: PlacedPiece,
  towerElev: number,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Find adjacent open hexes
  const adjacent: Array<{ id: string; q: number; r: number }> = [];
  for (const hId of piece.hexes) {
    const hex = hexes[hId];
    for (const n of getValidNeighbors(hex.q, hex.r, columns, rows)) {
      const nId = hexId(n.q, n.r);
      if (!piece.hexes.has(nId) && hexes[nId]?.terrain === 'open' && hexes[nId]?.elevation === 0) {
        adjacent.push({ id: nId, q: n.q, r: n.r });
      }
    }
  }

  if (adjacent.length === 0) return;

  // Create 1-2 rubble ramps adjacent to tower
  const unique = [...new Map(adjacent.map(a => [a.id, a])).values()];
  const shuffled = shuffleArray(unique, random);
  const numRamps = Math.min(shuffled.length, randomInt(1, 2, random));

  for (let i = 0; i < numRamps; i++) {
    const rampHex = hexes[shuffled[i].id];
    // Rubble as scaffolding/debris to climb
    rampHex.terrain = 'rubble';
    rampHex.class = 'terrain-rubble';
    rampHex.elevation = towerElev - 1;
    
    // If tower is +3 or higher, need another step down
    if (towerElev >= 3) {
      const rampNeighbors = getValidNeighbors(shuffled[i].q, shuffled[i].r, columns, rows);
      for (const rn of rampNeighbors) {
        const rnId = hexId(rn.q, rn.r);
        const rnHex = hexes[rnId];
        if (rnHex && rnHex.terrain === 'open' && rnHex.elevation === 0 && !piece.hexes.has(rnId)) {
          rnHex.terrain = 'rubble';
          rnHex.class = 'terrain-rubble';
          rnHex.elevation = towerElev - 2;
          
          // If tower is +4, need one more step
          if (towerElev >= 4) {
            const step3Neighbors = getValidNeighbors(rn.q, rn.r, columns, rows);
            for (const s3 of step3Neighbors) {
              const s3Id = hexId(s3.q, s3.r);
              const s3Hex = hexes[s3Id];
              if (s3Hex && s3Hex.terrain === 'open' && s3Hex.elevation === 0) {
                s3Hex.elevation = 1; // Just elevation, keep as open
                break;
              }
            }
          }
          break;
        }
      }
    }
  }
}

/**
 * Create ramps (intermediate elevation hexes) around elevated terrain.
 */
function createElevationRamps(
  hexes: Record<string, HexData>,
  piece: PlacedPiece,
  pieceElev: number,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Find adjacent open hexes at ground level
  const adjacent: string[] = [];
  for (const hId of piece.hexes) {
    const hex = hexes[hId];
    for (const n of getValidNeighbors(hex.q, hex.r, columns, rows)) {
      const nId = hexId(n.q, n.r);
      if (!piece.hexes.has(nId) && hexes[nId]?.terrain === 'open' && hexes[nId]?.elevation === 0) {
        adjacent.push(nId);
      }
    }
  }

  // Create ramp hexes stepping down from piece elevation
  const unique = [...new Set(adjacent)];
  const shuffled = shuffleArray(unique, random);
  const numRamps = Math.min(shuffled.length, randomInt(2, 4, random));

  for (let i = 0; i < numRamps; i++) {
    // Ramp is one level below the piece
    hexes[shuffled[i]].elevation = Math.max(1, pieceElev - 1);
  }
}

/**
 * Add dramatic elevation features: plateaus, ridges, trenches, cliffs.
 * This is where the real elevation drama comes from.
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
    const numPlateaus = Math.floor(1 + intensity * 3); // 1-4 plateaus
    
    for (let i = 0; i < numPlateaus; i++) {
      const q = randomInt(4, columns - 5, random);
      const r = randomInt(4, rows - 5, random);
      const hex = hexes[hexId(q, r)];
      
      if (hex && hex.terrain === 'open' && hex.elevation === 0) {
        // Plateau elevation scales with intensity and maxElev
        // High intensity = use max elevation
        const plateauElev = intensity > 0.7 
          ? maxElev 
          : Math.max(2, Math.floor(maxElev * (0.5 + intensity * 0.5)));
        
        // Grow plateau cluster
        const plateauSize = Math.floor(5 + intensity * 10); // 5-15 hexes
        const plateauHexes = growElevationCluster(hexes, q, r, plateauElev, plateauSize, columns, rows, random);
        
        // Add ramps around plateau
        addClusterRamps(hexes, plateauHexes, plateauElev, columns, rows, random);
      }
    }
  }

  // =========================================================================
  // RIDGES - Linear elevated features
  // =========================================================================
  if (intensity > 0.4 && maxElev >= 2) {
    const numRidges = Math.floor(intensity * 2); // 0-2 ridges
    
    for (let i = 0; i < numRidges; i++) {
      const startQ = randomInt(3, columns - 4, random);
      const startR = randomInt(3, rows - 4, random);
      const hex = hexes[hexId(startQ, startR)];
      
      if (hex && hex.terrain === 'open' && hex.elevation === 0) {
        const ridgeElev = Math.max(2, Math.floor(maxElev * (0.6 + intensity * 0.4)));
        const ridgeLength = Math.floor(6 + intensity * 8); // 6-14 hexes
        
        growRidge(hexes, startQ, startR, ridgeElev, ridgeLength, columns, rows, random);
      }
    }
  }

  // =========================================================================
  // TRENCHES - Deep depressions (-1 to -2)
  // =========================================================================
  if (intensity > 0.4) {
    const numTrenches = Math.floor(intensity * 3); // 0-3 trenches
    
    for (let i = 0; i < numTrenches; i++) {
      const q = randomInt(4, columns - 5, random);
      const r = randomInt(4, rows - 5, random);
      const hex = hexes[hexId(q, r)];
      
      if (hex && hex.terrain === 'open' && hex.elevation === 0) {
        // Trench depth: -1 at medium intensity, -2 at high
        const trenchDepth = intensity > 0.7 ? -2 : -1;
        const trenchSize = Math.floor(3 + intensity * 6); // 3-9 hexes
        
        growElevationCluster(hexes, q, r, trenchDepth, trenchSize, columns, rows, random);
      }
    }
  }

  // =========================================================================
  // SCATTERED ELEVATION - Individual hex variations
  // =========================================================================
  const scatterChance = 0.02 + intensity * 0.08; // 2% at low, 10% at high
  
  for (const hex of Object.values(hexes)) {
    if (hex.terrain === 'open' && hex.elevation === 0 && random() < scatterChance) {
      if (random() < 0.7) {
        // Mostly +1 bumps
        hex.elevation = 1;
      } else if (intensity > 0.5 && maxElev >= 2 && random() < 0.5) {
        // Some +2 at high intensity
        hex.elevation = 2;
      } else {
        // Some -1 dips
        hex.elevation = -1;
      }
    }
  }

  // =========================================================================
  // SMALL ELEVATION CLUSTERS - Medium-sized features
  // =========================================================================
  const numSmallClusters = Math.floor(2 + intensity * 6); // 2-8 clusters
  
  for (let i = 0; i < numSmallClusters; i++) {
    const q = randomInt(3, columns - 4, random);
    const r = randomInt(3, rows - 4, random);
    const hex = hexes[hexId(q, r)];
    
    if (hex && hex.terrain === 'open' && hex.elevation === 0) {
      // Cluster elevation varies
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
        clusterElev = -1; // Depression
      }
      
      const clusterSize = Math.floor(2 + intensity * 4); // 2-6 hexes
      const clusterHexes = growElevationCluster(hexes, q, r, clusterElev, clusterSize, columns, rows, random);
      
      // Add ramps for elevated clusters
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
    
    // Remove exhausted positions from frontier
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
    
    // Add some width to the ridge
    const neighbors = getValidNeighbors(q, r, columns, rows);
    for (const n of neighbors) {
      if (random() < 0.3) {
        const nHex = hexes[hexId(n.q, n.r)];
        if (nHex && nHex.terrain === 'open' && nHex.elevation === 0) {
          nHex.elevation = elevation;
        }
      }
    }
    
    // Move in the general direction with some wobble
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
  
  // Add ramps at intermediate elevations
  const unique = [...new Map(adjacent.map(a => [a.id, a])).values()];
  const shuffled = shuffleArray(unique, random);
  const numRamps = Math.min(shuffled.length, Math.floor(cluster.size * 0.5) + 1);
  
  for (let i = 0; i < numRamps; i++) {
    const rampElev = Math.max(1, clusterElev - 1);
    hexes[shuffled[i].id].elevation = rampElev;
    
    // For very high elevations, add additional ramp steps
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
 * CRITICAL: Validate that all elevated hexes have proper ramp access.
 * Every +3 must have an adjacent +2, every +2 must have an adjacent +1, etc.
 * This ensures units can actually climb to elevated positions.
 */
function validateElevationRamps(
  hexes: Record<string, HexData>,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Process from highest to lowest elevation
  // This ensures we create complete ramp chains
  for (let targetElev = 4; targetElev >= 2; targetElev--) {
    for (const hex of Object.values(hexes)) {
      if (hex.elevation !== targetElev) continue;
      
      // Check if this hex has an adjacent hex at (elevation - 1)
      const neighbors = getValidNeighbors(hex.q, hex.r, columns, rows);
      const hasRamp = neighbors.some(n => {
        const nHex = hexes[hexId(n.q, n.r)];
        return nHex && nHex.elevation === targetElev - 1;
      });
      
      if (!hasRamp) {
        // Need to create a ramp - find best candidate
        const candidates = neighbors.filter(n => {
          const nHex = hexes[hexId(n.q, n.r)];
          // Prefer open terrain, but can use any non-impassable
          if (!nHex) return false;
          const preset = TERRAIN_PRESETS[nHex.terrain];
          if (preset?.properties.impassable) return false;
          // Don't overwrite higher elevations
          if (nHex.elevation >= targetElev) return false;
          return true;
        });
        
        if (candidates.length > 0) {
          // Pick a random candidate and set its elevation
          const chosen = candidates[Math.floor(random() * candidates.length)];
          const chosenHex = hexes[hexId(chosen.q, chosen.r)];
          chosenHex.elevation = targetElev - 1;
        }
      }
    }
  }
  
  // Also validate negative elevations (-2 needs adjacent -1)
  for (const hex of Object.values(hexes)) {
    if (hex.elevation !== -2) continue;
    
    const neighbors = getValidNeighbors(hex.q, hex.r, columns, rows);
    const hasRamp = neighbors.some(n => {
      const nHex = hexes[hexId(n.q, n.r)];
      return nHex && nHex.elevation === -1;
    });
    
    if (!hasRamp) {
      const candidates = neighbors.filter(n => {
        const nHex = hexes[hexId(n.q, n.r)];
        if (!nHex) return false;
        const preset = TERRAIN_PRESETS[nHex.terrain];
        if (preset?.properties.impassable) return false;
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
    const preset = TERRAIN_PRESETS[hex.terrain];
    const parts: string[] = [preset?.name || 'Open'];

    if (hex.elevation !== 0) {
      const sign = hex.elevation > 0 ? '+' : '';
      parts.push(`Elev ${sign}${hex.elevation}`);
    }

    parts.push(coordToLabel(hex.q, hex.r));
    hex.n = parts.join(' | ');
  }
}

// =============================================================================
// DEBUG LOGGING
// =============================================================================

function logGenerationStats(
  hexes: Record<string, HexData>,
  pieces: PlacedPiece[],
  columns: number,
  rows: number,
  config: GeneratorConfig
): void {
  const totalHexes = columns * rows;
  const allHexes = Object.values(hexes);
  
  // Count terrain hexes (non-open)
  const terrainHexes = allHexes.filter(h => h.terrain !== 'open');
  const coverage = terrainHexes.length / totalHexes;
  
  // Count by LOS type
  let blockingHexes = 0;
  let coverHexes = 0;
  let difficultHexes = 0;
  let dangerousHexes = 0;
  
  for (const hex of terrainHexes) {
    const preset = TERRAIN_PRESETS[hex.terrain];
    if (!preset) continue;
    if (preset.losType === 'blocking' || preset.losType === 'partial') blockingHexes++;
    if (preset.properties.cover) coverHexes++;
    if (preset.properties.difficult) difficultHexes++;
    if (preset.properties.dangerous) dangerousHexes++;
  }
  
  // Count unique terrain pieces (by type)
  const terrainTypeCounts: Record<string, number> = {};
  for (const piece of pieces) {
    terrainTypeCounts[piece.terrainId] = (terrainTypeCounts[piece.terrainId] || 0) + 1;
  }
  
  // Find largest gap (approximate - check a few sample points)
  let maxGapFound = 0;
  for (let q = 0; q < columns; q += 4) {
    for (let r = 0; r < rows; r += 4) {
      const hex = hexes[hexId(q, r)];
      if (hex?.terrain === 'open') {
        // Simple distance to nearest terrain
        let minDist = Infinity;
        for (const th of terrainHexes) {
          const dist = hexDistance(q, r, th.q, th.r);
          if (dist < minDist) minDist = dist;
        }
        if (minDist > maxGapFound) maxGapFound = minDist;
      }
    }
  }
  
  // Check columns for LOS blockers
  let columnsWithoutBlocker = 0;
  for (let q = 0; q < columns; q++) {
    let hasBlocker = false;
    for (let r = 0; r < rows; r++) {
      const hex = hexes[hexId(q, r)];
      if (hex && hex.terrain !== 'open') {
        const preset = TERRAIN_PRESETS[hex.terrain];
        if (preset && (preset.losType === 'blocking' || preset.losType === 'partial')) {
          hasBlocker = true;
          break;
        }
      }
    }
    if (!hasBlocker) columnsWithoutBlocker++;
  }

  console.group('🗺️ Map Generation Stats');
  console.log(`Seed: ${config.seed}`);
  console.log(`Grid: ${columns}×${rows} = ${totalHexes} hexes`);
  console.log(`Piece Size: ${config.pieceSize.toFixed(1)} (${config.pieceSize < 0.4 ? 'Small' : config.pieceSize < 0.7 ? 'Medium' : 'Large'})`);
  console.log('');
  
  console.log('📊 PIECE COUNT');
  console.log(`  Placed pieces: ${pieces.length}`);
  console.log(`  Target (OPR): 8-10 pieces`);
  console.log(`  Avg hexes/piece: ${(terrainHexes.length / pieces.length).toFixed(1)}`);
  console.log(`  Terrain types:`, terrainTypeCounts);
  console.log('');
  
  console.log('📐 COVERAGE');
  console.log(`  Terrain hexes: ${terrainHexes.length}`);
  console.log(`  Coverage: ${(coverage * 100).toFixed(1)}%`);
  console.log(`  Target (OPR): ~25%`);
  console.log('');
  
  console.log('🎯 TERRAIN MIX (of terrain hexes)');
  console.log(`  LOS Blocking: ${blockingHexes} (${((blockingHexes / terrainHexes.length) * 100).toFixed(0)}%) - Target: 50%`);
  console.log(`  Cover: ${coverHexes} (${((coverHexes / terrainHexes.length) * 100).toFixed(0)}%) - Target: 33%`);
  console.log(`  Difficult: ${difficultHexes} (${((difficultHexes / terrainHexes.length) * 100).toFixed(0)}%) - Target: 33%`);
  console.log(`  Dangerous: ${dangerousHexes} (${((dangerousHexes / terrainHexes.length) * 100).toFixed(0)}%)`);
  console.log('');
  
  console.log('📏 SPACING');
  console.log(`  Largest gap to terrain: ~${maxGapFound} hexes`);
  console.log(`  Max allowed (OPR): ${MAX_TERRAIN_GAP_HEXES} hexes`);
  console.log(`  Min passage (OPR): ${MIN_PASSAGE_HEXES} hexes`);
  console.log('');
  
  console.log('👁️ LOS BLOCKING');
  console.log(`  Columns without blocker: ${columnsWithoutBlocker} of ${columns}`);
  console.log(`  (Some gaps OK, but deployment edges should be blocked)`);
  
  console.groupEnd();
}
