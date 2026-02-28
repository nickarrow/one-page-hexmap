/**
 * Procedural hex map generator following OPR terrain placement guidelines.
 *
 * The generation process:
 * 1. Initialize empty grid
 * 2. Select terrain types based on configured mix percentages
 * 3. Place terrain clusters across the map
 * 4. Validate and fix OPR placement rules (LOS blocking, gap limits)
 * 5. Validate terrain type distribution
 * 6. Add elevation with climbable paths
 * 7. Update hex tooltips
 *
 * Key OPR rules implemented (rulebook lines 221-258):
 * - ~25% terrain coverage (configurable 20-35%)
 * - At least 50% of terrain blocks/partially blocks LOS
 * - At least 33% provides cover
 * - At least 33% is difficult terrain
 * - No edge-to-edge clear sightlines
 * - No gaps larger than 6 hexes (12" at half-scale)
 */

import type { GeneratorConfig, HexJSON, HexData } from '../types';
import { TERRAIN_PRESETS, getPlaceableTerrains } from './terrainPresets';
import { createSeededRandom, randomInt, pickRandom, shuffleArray } from './random';
import { coordToLabel, hexId, getValidNeighbors, hexDistance } from './hexmath';
import {
  TERRAIN_COVERAGE,
  MAX_TERRAIN_GAP_HEXES,
  MIN_DANGEROUS_TERRAIN_PIECES,
  AVERAGE_CLUSTER_SIZE,
  PLACEMENT_EDGE_MARGIN,
  ELEVATION,
  GENERATION_CHANCES,
  SCATTERED_RISE_CLUSTERS,
  ALGORITHM_LIMITS,
  GAP_FILL_TERRAIN_OPTIONS,
  LOS_BLOCKER_TERRAIN,
} from './constants';

/** Tracks a placed terrain cluster for elevation processing */
interface PlacedCluster {
  terrainId: string;
  hexes: Set<string>;
  centerQ: number;
  centerR: number;
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

/**
 * Generate a complete hex map based on configuration.
 */
export function generateMap(config: GeneratorConfig): HexJSON {
  const random = createSeededRandom(config.seed);
  const { columns, rows } = config;
  const totalHexes = columns * rows;

  // Calculate target terrain coverage based on density slider
  const targetCoverage = TERRAIN_COVERAGE.MIN + config.density * TERRAIN_COVERAGE.RANGE;
  const targetTerrainHexes = Math.floor(totalHexes * targetCoverage);
  const numClusters = Math.ceil(targetTerrainHexes / AVERAGE_CLUSTER_SIZE);

  // Initialize grid with open terrain
  const hexes = initializeGrid(columns, rows);

  // Select and place terrain
  const terrainSelection = selectTerrains(config, numClusters, random);
  const placementPositions = generatePlacementPositions(columns, rows, numClusters, random);
  const { placedClusters, occupiedHexes } = placeTerrainClusters(
    hexes,
    terrainSelection,
    placementPositions,
    columns,
    rows,
    random
  );

  // Validate and fix placement per OPR rules
  validateAndFixPlacement(hexes, occupiedHexes, columns, rows, random);
  validateTerrainMix(hexes, occupiedHexes, columns, rows, config, random);

  // Add elevation system
  if (config.elevationEnabled) {
    addElevation(hexes, placedClusters, columns, rows, config, random);
  }

  // Final pass: update tooltips
  updateHexTooltips(hexes);

  return { layout: 'odd-q', hexes };
}

// =============================================================================
// GRID INITIALIZATION
// =============================================================================

/**
 * Create the initial hex grid with all hexes set to open terrain.
 */
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
 * Select terrain types to place based on configured mix percentages.
 * Ensures OPR requirements for blocking, cover, difficult, and dangerous terrain.
 */
function selectTerrains(config: GeneratorConfig, count: number, random: () => number): string[] {
  const placeableTerrains = getPlaceableTerrains();
  const result: string[] = [];

  // Calculate counts for each category
  const blockingCount = Math.ceil(count * config.terrainMix.blocking);
  const coverCount = Math.ceil(count * config.terrainMix.cover);
  const difficultCount = Math.ceil(count * config.terrainMix.difficult);
  const dangerousCount =
    config.terrainMix.dangerous > 0
      ? Math.max(MIN_DANGEROUS_TERRAIN_PIECES, Math.ceil(count * config.terrainMix.dangerous))
      : 0;

  // Add terrain by category (some terrain counts toward multiple categories)
  addTerrainsFromCategory(
    result,
    placeableTerrains,
    (t) => t.properties.blocking,
    blockingCount,
    random
  );
  addTerrainsFromCategory(
    result,
    placeableTerrains,
    (t) => t.properties.cover && !t.properties.blocking,
    coverCount,
    random
  );
  addTerrainsFromCategory(
    result,
    placeableTerrains,
    (t) => !!t.properties.difficult && !t.properties.cover && !t.properties.blocking,
    difficultCount,
    random
  );
  addTerrainsFromCategory(
    result,
    placeableTerrains,
    (t) => t.properties.dangerous === true,
    dangerousCount,
    random
  );

  // Fill remaining slots with mixed terrain
  while (result.length < count) {
    result.push(pickRandom(placeableTerrains, random).id);
  }

  return shuffleArray(result.slice(0, count), random);
}

/**
 * Helper to add terrain IDs from a filtered category.
 */
function addTerrainsFromCategory(
  result: string[],
  terrains: ReturnType<typeof getPlaceableTerrains>,
  filter: (t: ReturnType<typeof getPlaceableTerrains>[0]) => boolean,
  count: number,
  random: () => number
): void {
  const candidates = terrains.filter(filter);
  for (let i = 0; i < count && candidates.length > 0; i++) {
    result.push(pickRandom(candidates, random).id);
  }
}

// =============================================================================
// PLACEMENT POSITIONING
// =============================================================================

/**
 * Generate evenly-distributed placement positions across the map.
 * Divides the map into a grid of sections and places one position per section.
 */
function generatePlacementPositions(
  columns: number,
  rows: number,
  count: number,
  random: () => number
): Array<{ q: number; r: number }> {
  const positions: Array<{ q: number; r: number }> = [];
  const margin = PLACEMENT_EDGE_MARGIN;

  // Divide map into grid sections for even distribution
  const sectionsX = Math.ceil(Math.sqrt(count));
  const sectionsY = Math.ceil(count / sectionsX);
  const sectionWidth = (columns - margin * 2) / sectionsX;
  const sectionHeight = (rows - margin * 2) / sectionsY;

  for (let sy = 0; sy < sectionsY; sy++) {
    for (let sx = 0; sx < sectionsX; sx++) {
      if (positions.length >= count) break;

      const baseQ = margin + sx * sectionWidth;
      const baseR = margin + sy * sectionHeight;

      // Random position within section
      const q = Math.floor(baseQ + random() * sectionWidth);
      const r = Math.floor(baseR + random() * sectionHeight);

      positions.push({
        q: Math.min(q, columns - margin - 1),
        r: Math.min(r, rows - margin - 1),
      });
    }
  }

  return shuffleArray(positions, random);
}

// =============================================================================
// TERRAIN CLUSTER PLACEMENT
// =============================================================================

/**
 * Place all terrain clusters on the map.
 */
function placeTerrainClusters(
  hexes: Record<string, HexData>,
  terrainSelection: string[],
  positions: Array<{ q: number; r: number }>,
  columns: number,
  rows: number,
  random: () => number
): { placedClusters: PlacedCluster[]; occupiedHexes: Set<string> } {
  const placedClusters: PlacedCluster[] = [];
  const occupiedHexes = new Set<string>();

  for (let i = 0; i < terrainSelection.length && i < positions.length; i++) {
    const terrainId = terrainSelection[i];
    const preset = TERRAIN_PRESETS[terrainId];
    const position = positions[i];

    const targetSize = randomInt(preset.clusterSize.min, preset.clusterSize.max, random);
    const clusterResult = generateCluster(
      position.q,
      position.r,
      targetSize,
      preset.shape,
      columns,
      rows,
      occupiedHexes,
      random
    );

    if (clusterResult.hexes.size >= preset.clusterSize.min) {
      applyTerrainToCluster(hexes, clusterResult.hexes, terrainId, occupiedHexes);
      placedClusters.push({
        terrainId,
        hexes: clusterResult.hexes,
        centerQ: clusterResult.centerQ,
        centerR: clusterResult.centerR,
      });
    }
  }

  return { placedClusters, occupiedHexes };
}

/**
 * Apply a terrain type to a set of hex IDs.
 */
function applyTerrainToCluster(
  hexes: Record<string, HexData>,
  clusterHexes: Set<string>,
  terrainId: string,
  occupiedHexes: Set<string>
): void {
  for (const hexIdStr of clusterHexes) {
    const hex = hexes[hexIdStr];
    hex.terrain = terrainId;
    hex.class = `terrain-${terrainId}`;
    occupiedHexes.add(hexIdStr);
  }
}

/**
 * Generate a cluster of hexes around a center point.
 * Supports different growth shapes: organic (BFS), linear, circular.
 */
function generateCluster(
  centerQ: number,
  centerR: number,
  targetSize: number,
  shape: 'organic' | 'rectangular' | 'circular' | 'linear',
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): { hexes: Set<string>; centerQ: number; centerR: number } {
  const cluster = new Set<string>();

  // Find available center (original or nearby)
  const center = findAvailableCenter(centerQ, centerR, columns, rows, occupied, random);
  if (!center) {
    return { hexes: cluster, centerQ, centerR };
  }

  cluster.add(hexId(center.q, center.r));

  if (shape === 'linear') {
    growLinearCluster(cluster, center, targetSize, columns, rows, occupied, random);
  } else {
    growOrganicCluster(cluster, center, targetSize, shape, columns, rows, occupied, random);
  }

  return { hexes: cluster, centerQ: center.q, centerR: center.r };
}

/**
 * Find an available hex at or near the requested center.
 */
function findAvailableCenter(
  q: number,
  r: number,
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): { q: number; r: number } | null {
  const id = hexId(q, r);
  if (!occupied.has(id)) {
    return { q, r };
  }

  const neighbors = getValidNeighbors(q, r, columns, rows);
  const available = neighbors.filter((n) => !occupied.has(hexId(n.q, n.r)));
  return available.length > 0 ? pickRandom(available, random) : null;
}

/**
 * Grow cluster in a line from center.
 */
function growLinearCluster(
  cluster: Set<string>,
  center: { q: number; r: number },
  targetSize: number,
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): void {
  const direction = randomInt(0, 5, random);
  let current = { ...center };

  for (let i = 1; i < targetSize; i++) {
    const neighbors = getValidNeighbors(current.q, current.r, columns, rows);
    if (neighbors.length === 0) break;

    const next = neighbors[direction % neighbors.length];
    const nextId = hexId(next.q, next.r);

    if (!occupied.has(nextId) && !cluster.has(nextId)) {
      cluster.add(nextId);
      current = next;
    }
  }
}

/**
 * Grow cluster organically using BFS, optionally constrained to circular shape.
 */
function growOrganicCluster(
  cluster: Set<string>,
  center: { q: number; r: number },
  targetSize: number,
  shape: 'organic' | 'rectangular' | 'circular',
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): void {
  const frontier = [center];
  const maxAttempts = targetSize * ALGORITHM_LIMITS.CLUSTER_GROWTH_MULTIPLIER;
  let attempts = 0;

  while (cluster.size < targetSize && frontier.length > 0 && attempts < maxAttempts) {
    attempts++;
    const current = frontier.shift()!;
    const neighbors = shuffleArray(getValidNeighbors(current.q, current.r, columns, rows), random);

    for (const neighbor of neighbors) {
      if (cluster.size >= targetSize) break;

      const neighborId = hexId(neighbor.q, neighbor.r);
      if (occupied.has(neighborId) || cluster.has(neighborId)) continue;

      // For circular shape, constrain distance from center
      if (shape === 'circular') {
        const dist = hexDistance(center.q, center.r, neighbor.q, neighbor.r);
        const maxDist = Math.ceil(Math.sqrt(targetSize)) + 1;
        if (dist > maxDist) continue;
      }

      cluster.add(neighborId);
      frontier.push(neighbor);
    }
  }
}

// =============================================================================
// OPR PLACEMENT VALIDATION
// =============================================================================

/**
 * Validate terrain placement against OPR guidelines and fix issues.
 * - No edge-to-edge clear LOS
 * - No gaps larger than MAX_TERRAIN_GAP_HEXES
 */
function validateAndFixPlacement(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  random: () => number
): void {
  fixEdgeToEdgeLOS(hexes, occupied, columns, rows, random);
  fixLargeGaps(hexes, occupied, columns, rows, random);
}

/**
 * Ensure no row or column has clear LOS from edge to edge.
 */
function fixEdgeToEdgeLOS(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Check all rows
  for (let r = 0; r < rows; r++) {
    if (!rowHasLOSBlocker(hexes, r, columns)) {
      addLOSBlocker(hexes, occupied, r, columns, rows, 'horizontal', random);
    }
  }

  // Check columns at intervals (full check would be expensive)
  for (let q = 0; q < columns; q += ALGORITHM_LIMITS.VERTICAL_LOS_CHECK_INTERVAL) {
    if (!columnHasLOSBlocker(hexes, q, rows)) {
      addLOSBlocker(hexes, occupied, q, columns, rows, 'vertical', random);
    }
  }
}

function rowHasLOSBlocker(hexes: Record<string, HexData>, r: number, columns: number): boolean {
  for (let q = 0; q < columns; q++) {
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
 * Add a small forest cluster to break a clear sightline.
 */
function addLOSBlocker(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  index: number,
  columns: number,
  rows: number,
  direction: 'horizontal' | 'vertical',
  random: () => number
): void {
  const length = direction === 'horizontal' ? columns : rows;
  const midPoint = Math.floor(length / 2);
  const searchRange = Math.floor(length / 4);

  for (let offset = 0; offset <= searchRange; offset++) {
    for (const delta of [offset, -offset]) {
      const pos = midPoint + delta;
      if (pos < 2 || pos >= length - 2) continue;

      const q = direction === 'horizontal' ? pos : index;
      const r = direction === 'horizontal' ? index : pos;
      const id = hexId(q, r);

      if (!occupied.has(id) && hexes[id]?.terrain === 'open') {
        placeSmallCluster(hexes, occupied, q, r, LOS_BLOCKER_TERRAIN, columns, rows, random);
        return;
      }
    }
  }
}

/**
 * Place a small cluster (1-3 hexes) of terrain at a location.
 */
function placeSmallCluster(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  q: number,
  r: number,
  terrainId: string,
  columns: number,
  rows: number,
  random: () => number
): void {
  const id = hexId(q, r);
  hexes[id].terrain = terrainId;
  hexes[id].class = `terrain-${terrainId}`;
  occupied.add(id);

  // Add 1-2 adjacent hexes
  const neighbors = shuffleArray(getValidNeighbors(q, r, columns, rows), random);
  let added = 0;

  for (const neighbor of neighbors) {
    if (added >= ALGORITHM_LIMITS.FILL_CLUSTER_MAX_ADJACENT) break;
    const nId = hexId(neighbor.q, neighbor.r);
    if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
      hexes[nId].terrain = terrainId;
      hexes[nId].class = `terrain-${terrainId}`;
      occupied.add(nId);
      added++;
    }
  }
}

/**
 * Find and fill gaps larger than MAX_TERRAIN_GAP_HEXES.
 */
function fixLargeGaps(
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

      const gap = measureGap(hexes, q, r, columns, rows, checked);
      if (gap.maxExtent > MAX_TERRAIN_GAP_HEXES) {
        fillGap(hexes, occupied, gap.centerQ, gap.centerR, columns, rows, random);
      }
    }
  }
}

/**
 * Measure the extent of a connected open area using BFS.
 */
function measureGap(
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
  let hexCount = 0;

  while (frontier.length > 0 && hexCount < ALGORITHM_LIMITS.GAP_SEARCH_MAX_HEXES) {
    const current = frontier.shift()!;
    const id = hexId(current.q, current.r);

    if (checked.has(id)) continue;
    checked.add(id);

    const hex = hexes[id];
    if (!hex || hex.terrain !== 'open') continue;

    hexCount++;
    minQ = Math.min(minQ, current.q);
    maxQ = Math.max(maxQ, current.q);
    minR = Math.min(minR, current.r);
    maxR = Math.max(maxR, current.r);

    for (const neighbor of getValidNeighbors(current.q, current.r, columns, rows)) {
      const nId = hexId(neighbor.q, neighbor.r);
      if (!checked.has(nId)) {
        frontier.push(neighbor);
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
 * Fill a large gap with a small terrain cluster.
 */
function fillGap(
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
    const available = neighbors.find((n) => {
      const nId = hexId(n.q, n.r);
      return !occupied.has(nId) && hexes[nId]?.terrain === 'open';
    });
    if (available) {
      q = available.q;
      r = available.r;
    } else {
      return; // No available hex found
    }
  }

  const terrainId = pickRandom([...GAP_FILL_TERRAIN_OPTIONS], random);
  const clusterSize = randomInt(2, 4, random);
  const placed = [{ q, r }];

  hexes[hexId(q, r)].terrain = terrainId;
  hexes[hexId(q, r)].class = `terrain-${terrainId}`;
  occupied.add(hexId(q, r));

  // Grow cluster
  for (let i = 1; i < clusterSize; i++) {
    const last = placed[placed.length - 1];
    const neighbors = shuffleArray(getValidNeighbors(last.q, last.r, columns, rows), random);

    for (const neighbor of neighbors) {
      const nId = hexId(neighbor.q, neighbor.r);
      if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
        hexes[nId].terrain = terrainId;
        hexes[nId].class = `terrain-${terrainId}`;
        occupied.add(nId);
        placed.push(neighbor);
        break;
      }
    }
  }
}

// =============================================================================
// TERRAIN MIX VALIDATION
// =============================================================================

/**
 * Ensure terrain type distribution meets OPR percentage requirements.
 */
function validateTerrainMix(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  const counts = countTerrainByProperty(hexes);

  const requiredBlocking = Math.ceil(counts.total * config.terrainMix.blocking);
  const requiredCover = Math.ceil(counts.total * config.terrainMix.cover);
  const requiredDifficult = Math.ceil(counts.total * config.terrainMix.difficult);

  if (counts.blocking < requiredBlocking) {
    addTerrainOfType(
      hexes,
      occupied,
      columns,
      rows,
      'blocking',
      requiredBlocking - counts.blocking,
      random
    );
  }
  if (counts.cover < requiredCover) {
    addTerrainOfType(hexes, occupied, columns, rows, 'cover', requiredCover - counts.cover, random);
  }
  if (counts.difficult < requiredDifficult) {
    addTerrainOfType(
      hexes,
      occupied,
      columns,
      rows,
      'difficult',
      requiredDifficult - counts.difficult,
      random
    );
  }
}

/**
 * Count terrain hexes by property type.
 */
function countTerrainByProperty(hexes: Record<string, HexData>): {
  total: number;
  blocking: number;
  cover: number;
  difficult: number;
} {
  let total = 0,
    blocking = 0,
    cover = 0,
    difficult = 0;

  for (const hex of Object.values(hexes)) {
    if (hex.terrain === 'open') continue;
    total++;

    const preset = TERRAIN_PRESETS[hex.terrain];
    if (!preset) continue;

    if (preset.losType === 'blocking' || preset.losType === 'partial') blocking++;
    if (preset.properties.cover) cover++;
    if (preset.properties.difficult) difficult++;
  }

  return { total, blocking, cover, difficult };
}

/**
 * Add terrain hexes of a specific property type to meet requirements.
 */
function addTerrainOfType(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  terrainType: 'blocking' | 'cover' | 'difficult',
  count: number,
  random: () => number
): void {
  const placeableTerrains = getPlaceableTerrains();

  const candidates = placeableTerrains
    .filter((t) => {
      switch (terrainType) {
        case 'blocking':
          return t.losType === 'blocking' || t.losType === 'partial';
        case 'cover':
          return t.properties.cover;
        case 'difficult':
          return !!t.properties.difficult;
      }
    })
    .map((t) => t.id);

  if (candidates.length === 0) return;

  let added = 0;
  const shuffledHexes = shuffleArray(Object.values(hexes), random);

  for (const hex of shuffledHexes) {
    if (added >= count) break;

    const id = hexId(hex.q, hex.r);
    if (hex.terrain !== 'open' || occupied.has(id)) continue;

    const terrainId = pickRandom(candidates, random);
    hex.terrain = terrainId;
    hex.class = `terrain-${terrainId}`;
    occupied.add(id);
    added++;

    // Add 1-2 adjacent hexes to form cluster
    const neighbors = shuffleArray(getValidNeighbors(hex.q, hex.r, columns, rows), random);
    let clusterAdded = 0;

    for (const neighbor of neighbors) {
      if (added >= count || clusterAdded >= ALGORITHM_LIMITS.FILL_CLUSTER_MAX_ADJACENT) break;

      const nId = hexId(neighbor.q, neighbor.r);
      const neighborHex = hexes[nId];

      if (neighborHex && neighborHex.terrain === 'open' && !occupied.has(nId)) {
        neighborHex.terrain = terrainId;
        neighborHex.class = `terrain-${terrainId}`;
        occupied.add(nId);
        added++;
        clusterAdded++;
      }
    }
  }
}

// =============================================================================
// ELEVATION SYSTEM
// =============================================================================

/**
 * Add elevation to terrain with proper climbable paths.
 * Per OPR: ±1 level is climbable, ±2+ requires intermediate steps.
 */
function addElevation(
  hexes: Record<string, HexData>,
  clusters: PlacedCluster[],
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  // Process clusters with base elevation
  for (const cluster of clusters) {
    const preset = TERRAIN_PRESETS[cluster.terrainId];
    if (!preset.baseElevation) continue;

    setClusterElevation(hexes, cluster, preset.baseElevation);

    if (preset.baseElevation > 0) {
      createElevationRamps(hexes, cluster, columns, rows, random);
    }

    // Add peaks to hills
    if (
      preset.id === 'hill' &&
      cluster.hexes.size >= 4 &&
      random() < GENERATION_CHANCES.HILL_PEAK
    ) {
      addPeakToCluster(hexes, cluster, config.elevationRange.max);
    }

    if (
      preset.id === 'steepHill' &&
      cluster.hexes.size >= 4 &&
      random() < GENERATION_CHANCES.STEEP_HILL_PEAK
    ) {
      addPeakToCluster(hexes, cluster, config.elevationRange.max);
      ensureClimbableRing(hexes, cluster, columns, rows);
    }

    // Ensure climbable paths for +2 terrain
    if (preset.id === 'steepHill' || preset.id === 'tower') {
      ensureClimbableApproach(hexes, cluster, columns, rows, random);
    }
  }

  // Give some ruins elevation
  for (const cluster of clusters) {
    if (cluster.terrainId === 'ruins' && random() < GENERATION_CHANCES.RUINS_ELEVATION) {
      setClusterElevation(hexes, cluster, 1);
      createElevationRamps(hexes, cluster, columns, rows, random);
    }
  }

  // Add scattered elevation to open terrain
  addScatteredElevation(hexes, columns, rows, config, random);
}

function setClusterElevation(
  hexes: Record<string, HexData>,
  cluster: PlacedCluster,
  elevation: number
): void {
  for (const hexIdStr of cluster.hexes) {
    hexes[hexIdStr].elevation = elevation;
  }
}

/**
 * Create intermediate elevation hexes around elevated terrain for climbability.
 */
function createElevationRamps(
  hexes: Record<string, HexData>,
  cluster: PlacedCluster,
  columns: number,
  rows: number,
  random: () => number
): void {
  const preset = TERRAIN_PRESETS[cluster.terrainId];
  const targetElev = preset.baseElevation || 1;

  if (targetElev < 2) return; // Only needed for +2 or higher

  // Find adjacent open hexes at ground level
  const adjacentOpen: string[] = [];
  for (const hexIdStr of cluster.hexes) {
    const hex = hexes[hexIdStr];
    for (const neighbor of getValidNeighbors(hex.q, hex.r, columns, rows)) {
      const nId = hexId(neighbor.q, neighbor.r);
      const nHex = hexes[nId];
      if (nHex && nHex.terrain === 'open' && nHex.elevation === 0 && !cluster.hexes.has(nId)) {
        adjacentOpen.push(nId);
      }
    }
  }

  // Create ramp hexes
  const numRamps = Math.min(
    adjacentOpen.length,
    randomInt(ELEVATION.RAMP_HEXES_MIN, ELEVATION.RAMP_HEXES_MAX, random)
  );
  const shuffled = shuffleArray([...new Set(adjacentOpen)], random);

  for (let i = 0; i < numRamps; i++) {
    hexes[shuffled[i]].elevation = 1;
  }
}

/**
 * Add a +1 elevation peak to the center of a cluster.
 */
function addPeakToCluster(
  hexes: Record<string, HexData>,
  cluster: PlacedCluster,
  maxElev: number
): void {
  const centerHex = hexes[hexId(cluster.centerQ, cluster.centerR)];
  if (centerHex && cluster.hexes.has(hexId(cluster.centerQ, cluster.centerR))) {
    centerHex.elevation = Math.min(centerHex.elevation + 1, maxElev);
  }
}

/**
 * Ensure hexes around a +3 peak are at +2 for climbability.
 */
function ensureClimbableRing(
  hexes: Record<string, HexData>,
  cluster: PlacedCluster,
  columns: number,
  rows: number
): void {
  const neighbors = getValidNeighbors(cluster.centerQ, cluster.centerR, columns, rows);
  for (const neighbor of neighbors) {
    const nId = hexId(neighbor.q, neighbor.r);
    if (cluster.hexes.has(nId) && hexes[nId].elevation < 2) {
      hexes[nId].elevation = 2;
    }
  }
}

/**
 * Ensure steep terrain has at least one climbable approach from ground level.
 */
function ensureClimbableApproach(
  hexes: Record<string, HexData>,
  cluster: PlacedCluster,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Find edge hexes (those with external neighbors)
  const edgeHexes: string[] = [];
  for (const hexIdStr of cluster.hexes) {
    const hex = hexes[hexIdStr];
    const hasExternalNeighbor = getValidNeighbors(hex.q, hex.r, columns, rows).some(
      (n) => !cluster.hexes.has(hexId(n.q, n.r))
    );
    if (hasExternalNeighbor) {
      edgeHexes.push(hexIdStr);
    }
  }

  if (edgeHexes.length === 0) return;

  // Set 1-2 edge hexes to +1 elevation for climbable approach
  const numApproaches = Math.min(
    edgeHexes.length,
    randomInt(ELEVATION.APPROACH_POINTS_MIN, ELEVATION.APPROACH_POINTS_MAX, random)
  );
  const shuffled = shuffleArray(edgeHexes, random);

  for (let i = 0; i < numApproaches; i++) {
    hexes[shuffled[i]].elevation = 1;
  }
}

/**
 * Add scattered small elevation changes to open terrain for variety.
 */
function addScatteredElevation(
  hexes: Record<string, HexData>,
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  const { min: minElev, max: maxElev } = config.elevationRange;

  // Random individual hex elevation changes
  for (const hex of Object.values(hexes)) {
    if (
      hex.terrain === 'open' &&
      hex.elevation === 0 &&
      random() < GENERATION_CHANCES.SCATTERED_ELEVATION
    ) {
      const isRise = random() < GENERATION_CHANCES.SCATTERED_RISE_VS_DEPRESSION;
      hex.elevation = Math.max(minElev, Math.min(maxElev, isRise ? 1 : -1));
    }
  }

  // Create small elevated clusters
  const numRises = randomInt(SCATTERED_RISE_CLUSTERS.MIN, SCATTERED_RISE_CLUSTERS.MAX, random);
  const margin = 4;

  for (let i = 0; i < numRises; i++) {
    const q = randomInt(margin, columns - margin, random);
    const r = randomInt(margin, rows - margin, random);
    const hex = hexes[hexId(q, r)];

    if (hex && hex.terrain === 'open' && hex.elevation === 0) {
      hex.elevation = 1;

      const clusterSize = randomInt(
        SCATTERED_RISE_CLUSTERS.SIZE_MIN,
        SCATTERED_RISE_CLUSTERS.SIZE_MAX,
        random
      );
      const neighbors = shuffleArray(getValidNeighbors(q, r, columns, rows), random);
      let added = 0;

      for (const neighbor of neighbors) {
        if (added >= clusterSize) break;
        const nHex = hexes[hexId(neighbor.q, neighbor.r)];
        if (nHex && nHex.terrain === 'open' && nHex.elevation === 0) {
          nHex.elevation = 1;
          added++;
        }
      }
    }
  }
}

// =============================================================================
// TOOLTIP GENERATION
// =============================================================================

/**
 * Update hex tooltips with terrain name, elevation, and coordinates.
 */
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
