import type { GeneratorConfig, HexJSON, HexData } from '../types';
import { TERRAIN_PRESETS, getPlaceableTerrains } from './terrainPresets';
import { createSeededRandom, randomInt, pickRandom, shuffleArray } from './random';
import { coordToLabel, hexId, getValidNeighbors, hexDistance } from './hexmath';

interface PlacedCluster {
  terrainId: string;
  hexes: Set<string>;
  centerQ: number;
  centerR: number;
}

/**
 * Generate a hex map based on configuration
 */
export function generateMap(config: GeneratorConfig): HexJSON {
  const random = createSeededRandom(config.seed);
  const { columns, rows } = config;
  const totalHexes = columns * rows;
  
  // OPR Guidelines (rulebook lines 221-242):
  // - At least 25% of table should be covered with terrain
  // - Density slider scales from 20% to 35% coverage
  const targetCoverage = 0.20 + config.density * 0.15; // 20-35% based on density
  const targetTerrainHexes = Math.floor(totalHexes * targetCoverage);
  
  // Initialize all hexes as open
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
  
  // Calculate number of clusters based on target coverage
  // Average cluster size is ~5 hexes, so estimate cluster count
  const avgClusterSize = 5;
  const numClusters = Math.ceil(targetTerrainHexes / avgClusterSize);
  
  // Select terrain types based on mix requirements
  const terrainSelection = selectTerrains(config, numClusters, random);
  
  // Place terrain clusters
  const placedClusters: PlacedCluster[] = [];
  const occupiedHexes = new Set<string>();
  
  // Generate placement positions spread across the map
  const placementPositions = generatePlacementPositions(columns, rows, numClusters, random);
  
  for (let i = 0; i < terrainSelection.length && i < placementPositions.length; i++) {
    const terrainId = terrainSelection[i];
    const preset = TERRAIN_PRESETS[terrainId];
    const position = placementPositions[i];
    
    // Generate cluster with minimum size enforcement
    const targetSize = randomInt(preset.clusterSize.min, preset.clusterSize.max, random);
    const clusterResult = generateCluster(
      position.q,
      position.r,
      targetSize,
      preset.clusterSize.min, // Enforce minimum
      preset.shape,
      columns,
      rows,
      occupiedHexes,
      random
    );
    
    if (clusterResult.hexes.size >= preset.clusterSize.min) {
      // Apply terrain to hexes
      for (const hexIdStr of clusterResult.hexes) {
        const hex = hexes[hexIdStr];
        hex.terrain = terrainId;
        hex.class = `terrain-${terrainId}`;
        occupiedHexes.add(hexIdStr);
      }
      
      placedClusters.push({ 
        terrainId, 
        hexes: clusterResult.hexes,
        centerQ: clusterResult.centerQ,
        centerR: clusterResult.centerR
      });
    }
  }
  
  // OPR Placement Validation (rulebook lines 252-257)
  // 1. No edge-to-edge clear LOS
  // 2. No gaps larger than 6 hexes (12" at half-scale)
  // 3. Minimum 3-hex pathways for large units (6" at half-scale)
  validateAndFixPlacement(hexes, placedClusters, occupiedHexes, columns, rows, random);
  
  // Validate terrain type distribution (rulebook lines 221-242)
  // Ensure we meet the OPR percentage requirements for terrain types
  validateTerrainMix(hexes, occupiedHexes, columns, rows, config, random);
  
  // Add elevation if enabled - with proper climbable paths
  if (config.elevationEnabled) {
    addElevationWithPaths(hexes, placedClusters, columns, rows, config, random);
  }
  
  // Final pass: update all hex tooltips with terrain name and elevation
  updateHexTooltips(hexes);
  
  return {
    layout: 'odd-q',
    hexes,
  };
}

/**
 * Select terrain types based on mix requirements
 */
function selectTerrains(
  config: GeneratorConfig,
  count: number,
  random: () => number
): string[] {
  const placeableTerrains = getPlaceableTerrains();
  const result: string[] = [];
  
  // Calculate how many of each category we need
  const blockingCount = Math.ceil(count * config.terrainMix.blocking);
  const coverCount = Math.ceil(count * config.terrainMix.cover);
  const difficultCount = Math.ceil(count * config.terrainMix.difficult);
  // OPR rule: "Each player should pick 1 piece to be dangerous" = 2 minimum
  // Use percentage but ensure at least 2 if dangerous > 0
  const dangerousCount = config.terrainMix.dangerous > 0 
    ? Math.max(2, Math.ceil(count * config.terrainMix.dangerous))
    : 0;
  
  // Blocking terrains (buildings, rocks)
  const blockingTerrains = placeableTerrains.filter(t => t.properties.blocking);
  for (let i = 0; i < blockingCount && blockingTerrains.length > 0; i++) {
    result.push(pickRandom(blockingTerrains, random).id);
  }
  
  // Cover terrains (forest, ruins, hill, barricade, crater)
  const coverTerrains = placeableTerrains.filter(t => t.properties.cover && !t.properties.blocking);
  for (let i = 0; i < coverCount && coverTerrains.length > 0; i++) {
    result.push(pickRandom(coverTerrains, random).id);
  }
  
  // Difficult terrains (rubble, water)
  const difficultTerrains = placeableTerrains.filter(
    t => t.properties.difficult && !t.properties.cover && !t.properties.blocking
  );
  for (let i = 0; i < difficultCount && difficultTerrains.length > 0; i++) {
    result.push(pickRandom(difficultTerrains, random).id);
  }
  
  // Dangerous terrains (lava) - OPR: 2 pieces minimum (1 per player)
  const dangerousTerrains = placeableTerrains.filter(t => t.properties.dangerous === true);
  for (let i = 0; i < dangerousCount && dangerousTerrains.length > 0; i++) {
    result.push(pickRandom(dangerousTerrains, random).id);
  }
  
  // Fill remaining with mixed terrains
  while (result.length < count) {
    result.push(pickRandom(placeableTerrains, random).id);
  }
  
  // Shuffle to distribute terrain types
  return shuffleArray(result.slice(0, count), random);
}

/**
 * Generate placement positions spread across the map
 */
function generatePlacementPositions(
  columns: number,
  rows: number,
  count: number,
  random: () => number
): Array<{ q: number; r: number }> {
  const positions: Array<{ q: number; r: number }> = [];
  const margin = 3; // Keep terrain away from edges
  
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
        r: Math.min(r, rows - margin - 1) 
      });
    }
  }
  
  return shuffleArray(positions, random);
}

/**
 * Generate a cluster of hexes around a center point
 * Returns the cluster and actual center used
 */
function generateCluster(
  centerQ: number,
  centerR: number,
  targetSize: number,
  _minSize: number, // Reserved for future validation
  shape: 'organic' | 'rectangular' | 'circular' | 'linear',
  columns: number,
  rows: number,
  occupied: Set<string>,
  random: () => number
): { hexes: Set<string>; centerQ: number; centerR: number } {
  const cluster = new Set<string>();
  let actualCenterQ = centerQ;
  let actualCenterR = centerR;
  const centerId = hexId(centerQ, centerR);
  
  // Check if center is available, try to find alternative
  if (occupied.has(centerId)) {
    const neighbors = getValidNeighbors(centerQ, centerR, columns, rows);
    const available = neighbors.filter(n => !occupied.has(hexId(n.q, n.r)));
    if (available.length === 0) {
      return { hexes: cluster, centerQ, centerR };
    }
    const newCenter = pickRandom(available, random);
    actualCenterQ = newCenter.q;
    actualCenterR = newCenter.r;
  }
  
  cluster.add(hexId(actualCenterQ, actualCenterR));
  
  if (shape === 'linear') {
    // Grow in a line
    const direction = randomInt(0, 5, random);
    let currentQ = actualCenterQ;
    let currentR = actualCenterR;
    
    for (let i = 1; i < targetSize; i++) {
      const neighbors = getValidNeighbors(currentQ, currentR, columns, rows);
      if (neighbors.length === 0) break;
      
      // Prefer continuing in same direction
      const next = neighbors[direction % neighbors.length];
      const nextId = hexId(next.q, next.r);
      
      if (!occupied.has(nextId) && !cluster.has(nextId)) {
        cluster.add(nextId);
        currentQ = next.q;
        currentR = next.r;
      }
    }
  } else {
    // Grow organically from center using BFS
    const frontier = [{ q: actualCenterQ, r: actualCenterR }];
    let attempts = 0;
    const maxAttempts = targetSize * 10; // Prevent infinite loops
    
    while (cluster.size < targetSize && frontier.length > 0 && attempts < maxAttempts) {
      attempts++;
      const current = frontier.shift()!;
      const neighbors = getValidNeighbors(current.q, current.r, columns, rows);
      
      // Shuffle neighbors for organic growth
      const shuffledNeighbors = shuffleArray(neighbors, random);
      
      for (const neighbor of shuffledNeighbors) {
        if (cluster.size >= targetSize) break;
        
        const neighborId = hexId(neighbor.q, neighbor.r);
        if (occupied.has(neighborId) || cluster.has(neighborId)) continue;
        
        // For circular shape, check distance from center
        if (shape === 'circular') {
          const dist = hexDistance(actualCenterQ, actualCenterR, neighbor.q, neighbor.r);
          const maxDist = Math.ceil(Math.sqrt(targetSize)) + 1;
          if (dist > maxDist) continue;
        }
        
        cluster.add(neighborId);
        frontier.push(neighbor);
      }
    }
  }
  
  return { hexes: cluster, centerQ: actualCenterQ, centerR: actualCenterR };
}

/**
 * Add elevation to terrain with proper climbable paths
 * Ensures elevated terrain has adjacent hexes at intermediate elevations
 */
function addElevationWithPaths(
  hexes: Record<string, HexData>,
  clusters: PlacedCluster[],
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  const { max } = config.elevationRange;
  
  // Process each cluster that has elevation
  for (const cluster of clusters) {
    const preset = TERRAIN_PRESETS[cluster.terrainId];
    const baseElev = preset.baseElevation;
    
    if (baseElev === undefined || baseElev === 0) continue;
    
    // Set the cluster's elevation
    for (const hexIdStr of cluster.hexes) {
      hexes[hexIdStr].elevation = baseElev;
    }
    
    // For elevated terrain (positive elevation), create approach ramps
    if (baseElev > 0) {
      createElevationRamp(hexes, cluster, columns, rows, random);
    }
    
    // For hills, add a higher peak in the center (60% chance, up from 40%)
    if (preset.id === 'hill' && cluster.hexes.size >= 4 && random() < 0.6) {
      const centerHex = hexes[hexId(cluster.centerQ, cluster.centerR)];
      if (centerHex && centerHex.terrain === 'hill') {
        centerHex.elevation = Math.min(baseElev + 1, max); // +2 peak
      }
    }
    
    // For steep hills, add a +3 peak in the center (50% chance)
    if (preset.id === 'steepHill' && cluster.hexes.size >= 4 && random() < 0.5) {
      const centerHex = hexes[hexId(cluster.centerQ, cluster.centerR)];
      if (centerHex && centerHex.terrain === 'steepHill') {
        centerHex.elevation = Math.min(baseElev + 1, max); // +3 peak
        // Need a +2 ring around the +3 center for climbability
        const neighbors = getValidNeighbors(cluster.centerQ, cluster.centerR, columns, rows);
        for (const neighbor of neighbors) {
          const nId = hexId(neighbor.q, neighbor.r);
          if (cluster.hexes.has(nId) && hexes[nId].elevation < 3) {
            hexes[nId].elevation = 2;
          }
        }
      }
    }
    
    // For steep hills, ensure there's a climbable path
    if (preset.id === 'steepHill') {
      ensureClimbablePath(hexes, cluster, columns, rows, random);
    }
    
    // For towers, ensure there's a climbable path (they're +2)
    if (preset.id === 'tower') {
      ensureClimbablePath(hexes, cluster, columns, rows, random);
    }
  }
  
  // Give some ruins elevation (50% chance for +1 - partial walls to climb on)
  for (const cluster of clusters) {
    if (cluster.terrainId === 'ruins' && random() < 0.5) {
      // Set ruins to +1 elevation
      for (const hexIdStr of cluster.hexes) {
        hexes[hexIdStr].elevation = 1;
      }
      // Create ramps for the elevated ruins
      createElevationRamp(hexes, cluster, columns, rows, random);
    }
  }
  
  // Add standalone elevation features (small rises/depressions)
  addScatteredElevation(hexes, columns, rows, config, random);
}

/**
 * Create a ramp of intermediate elevation hexes around elevated terrain
 */
function createElevationRamp(
  hexes: Record<string, HexData>,
  cluster: PlacedCluster,
  columns: number,
  rows: number,
  random: () => number
): void {
  const preset = TERRAIN_PRESETS[cluster.terrainId];
  const targetElev = preset.baseElevation || 1;
  
  // Find all hexes adjacent to the cluster that are at ground level
  const adjacentHexes = new Set<string>();
  
  for (const hexIdStr of cluster.hexes) {
    const hex = hexes[hexIdStr];
    const neighbors = getValidNeighbors(hex.q, hex.r, columns, rows);
    
    for (const neighbor of neighbors) {
      const neighborId = hexId(neighbor.q, neighbor.r);
      const neighborHex = hexes[neighborId];
      
      // Only consider open terrain at ground level
      if (neighborHex && 
          neighborHex.terrain === 'open' && 
          neighborHex.elevation === 0 &&
          !cluster.hexes.has(neighborId)) {
        adjacentHexes.add(neighborId);
      }
    }
  }
  
  // For each level of elevation, create approach hexes
  // E.g., for elevation 2, we need some +1 hexes adjacent
  if (targetElev >= 2) {
    // Pick 2-4 adjacent hexes to be intermediate elevation
    const adjacentList = Array.from(adjacentHexes);
    const numRampHexes = Math.min(adjacentList.length, randomInt(2, 4, random));
    const shuffled = shuffleArray(adjacentList, random);
    
    for (let i = 0; i < numRampHexes; i++) {
      const rampHex = hexes[shuffled[i]];
      rampHex.elevation = 1;
      rampHex.class = 'elevation-ramp';
    }
  }
}

/**
 * Ensure steep hills have at least one climbable approach
 */
function ensureClimbablePath(
  hexes: Record<string, HexData>,
  cluster: PlacedCluster,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Find edge hexes of the cluster
  const edgeHexes: string[] = [];
  
  for (const hexIdStr of cluster.hexes) {
    const hex = hexes[hexIdStr];
    const neighbors = getValidNeighbors(hex.q, hex.r, columns, rows);
    
    const hasExternalNeighbor = neighbors.some(n => {
      const nId = hexId(n.q, n.r);
      return !cluster.hexes.has(nId);
    });
    
    if (hasExternalNeighbor) {
      edgeHexes.push(hexIdStr);
    }
  }
  
  if (edgeHexes.length === 0) return;
  
  // Pick 1-2 edge hexes to have intermediate elevation (+1)
  const numApproaches = Math.min(edgeHexes.length, randomInt(1, 2, random));
  const shuffled = shuffleArray(edgeHexes, random);
  
  for (let i = 0; i < numApproaches; i++) {
    const approachHex = hexes[shuffled[i]];
    approachHex.elevation = 1; // Make this hex climbable from ground
    
    // Also add a +1 hex adjacent to this on the outside
    const neighbors = getValidNeighbors(approachHex.q, approachHex.r, columns, rows);
    for (const neighbor of neighbors) {
      const neighborId = hexId(neighbor.q, neighbor.r);
      const neighborHex = hexes[neighborId];
      
      if (neighborHex && 
          neighborHex.terrain === 'open' && 
          neighborHex.elevation === 0 &&
          !cluster.hexes.has(neighborId)) {
        // This creates a path: ground (0) -> ramp (1) -> steep hill edge (1) -> steep hill center (2)
        // Actually the edge is already +1, so we're good
        break;
      }
    }
  }
}

/**
 * Add scattered small elevation changes to open terrain
 */
function addScatteredElevation(
  hexes: Record<string, HexData>,
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  const { min: minElev, max: maxElev } = config.elevationRange;
  const hexList = Object.values(hexes);
  
  // Add small rises and depressions to open terrain (5% chance, up from 1%)
  for (const hex of hexList) {
    if (hex.terrain === 'open' && hex.elevation === 0 && random() < 0.05) {
      // 70% rises (+1), 30% depressions (-1)
      hex.elevation = random() < 0.7 ? 1 : -1;
      hex.elevation = Math.max(minElev, Math.min(maxElev, hex.elevation));
    }
  }
  
  // Create a few small elevated clusters (gentle rises) - 2-4 clusters
  const numRises = randomInt(2, 4, random);
  for (let i = 0; i < numRises; i++) {
    // Pick a random open hex away from edges
    const margin = 4;
    const q = randomInt(margin, columns - margin, random);
    const r = randomInt(margin, rows - margin, random);
    const id = hexId(q, r);
    const hex = hexes[id];
    
    if (hex && hex.terrain === 'open' && hex.elevation === 0) {
      // Create a small rise (2-4 hexes at +1)
      hex.elevation = 1;
      
      const neighbors = getValidNeighbors(q, r, columns, rows);
      const shuffled = shuffleArray(neighbors, random);
      const clusterSize = randomInt(1, 3, random);
      let added = 0;
      
      for (const neighbor of shuffled) {
        if (added >= clusterSize) break;
        const nId = hexId(neighbor.q, neighbor.r);
        const nHex = hexes[nId];
        if (nHex && nHex.terrain === 'open' && nHex.elevation === 0) {
          nHex.elevation = 1;
          added++;
        }
      }
    }
  }
}


/**
 * Update hex tooltips (n property) with terrain name and elevation
 */
function updateHexTooltips(hexes: Record<string, HexData>): void {
  for (const hex of Object.values(hexes)) {
    const preset = TERRAIN_PRESETS[hex.terrain];
    const coord = coordToLabel(hex.q, hex.r);
    
    // Build tooltip parts
    const parts: string[] = [];
    
    // Terrain name
    parts.push(preset?.name || 'Open');
    
    // Elevation if non-zero
    if (hex.elevation !== 0) {
      const sign = hex.elevation > 0 ? '+' : '';
      parts.push(`Elev ${sign}${hex.elevation}`);
    }
    
    // Coordinate
    parts.push(coord);
    
    hex.n = parts.join(' | ');
  }
}


// =============================================================================
// OPR PLACEMENT VALIDATION (rulebook lines 252-257)
// =============================================================================

const MAX_GAP_HEXES = 6;  // 12" at half-scale = 6 hexes
// const MIN_PATHWAY_HEXES = 3;  // 6" at half-scale = 3 hexes (reserved for future use)

/**
 * Validate terrain placement against OPR guidelines and fix issues
 */
function validateAndFixPlacement(
  hexes: Record<string, HexData>,
  _clusters: PlacedCluster[], // Reserved for future pathway validation
  occupied: Set<string>,
  columns: number,
  rows: number,
  random: () => number
): void {
  // 1. Check and fix edge-to-edge LOS
  fixEdgeToEdgeLOS(hexes, occupied, columns, rows, random);
  
  // 2. Check and fix large gaps (> 6 hexes)
  fixLargeGaps(hexes, occupied, columns, rows, random);
  
  // Note: We don't actively enforce minimum pathways because:
  // - The cluster placement algorithm naturally leaves gaps
  // - Blocking terrain is limited to ~50% of clusters
  // - Forcing pathways could conflict with the gap-filling logic
  // If needed, we could add pathway validation in the future
}

/**
 * Check for clear lines of sight from edge to edge and add blocking terrain
 */
function fixEdgeToEdgeLOS(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Check horizontal lines (left to right)
  for (let r = 0; r < rows; r++) {
    if (!hasLOSBlockerInRow(hexes, r, columns)) {
      // Add a blocking terrain piece somewhere in this row
      addLOSBlocker(hexes, occupied, r, columns, 'horizontal', random);
    }
  }
  
  // Check vertical lines (top to bottom) - sample every few columns
  for (let q = 0; q < columns; q += 4) {
    if (!hasLOSBlockerInColumn(hexes, q, rows)) {
      // Add a blocking terrain piece somewhere in this column
      addLOSBlocker(hexes, occupied, q, rows, 'vertical', random);
    }
  }
}

/**
 * Check if a row has any blocking or partial LOS terrain
 */
function hasLOSBlockerInRow(
  hexes: Record<string, HexData>,
  r: number,
  columns: number
): boolean {
  for (let q = 0; q < columns; q++) {
    const hex = hexes[hexId(q, r)];
    if (hex && hex.terrain !== 'open') {
      const preset = TERRAIN_PRESETS[hex.terrain];
      // Blocking or partial LOS terrain breaks the line
      if (preset && (preset.losType === 'blocking' || preset.losType === 'partial')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a column has any blocking or partial LOS terrain
 */
function hasLOSBlockerInColumn(
  hexes: Record<string, HexData>,
  q: number,
  rows: number
): boolean {
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
 * Add a LOS-blocking terrain piece to break a clear sightline
 */
function addLOSBlocker(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  index: number,
  length: number,
  direction: 'horizontal' | 'vertical',
  random: () => number
): void {
  // Find an open hex near the middle of the line
  const midPoint = Math.floor(length / 2);
  const searchRange = Math.floor(length / 4);
  
  for (let offset = 0; offset <= searchRange; offset++) {
    // Try both directions from midpoint
    for (const delta of [offset, -offset]) {
      const pos = midPoint + delta;
      if (pos < 2 || pos >= length - 2) continue;
      
      const q = direction === 'horizontal' ? pos : index;
      const r = direction === 'horizontal' ? index : pos;
      const id = hexId(q, r);
      
      if (!occupied.has(id) && hexes[id]?.terrain === 'open') {
        // Place a forest (partial LOS, common terrain)
        hexes[id].terrain = 'forest';
        hexes[id].class = 'terrain-forest';
        occupied.add(id);
        
        // Add 1-2 adjacent hexes to make it a small cluster
        const neighbors = getValidNeighbors(q, r, 
          direction === 'horizontal' ? length : 36,
          direction === 'vertical' ? length : 24
        );
        const shuffled = shuffleArray(neighbors, random);
        let added = 0;
        
        for (const neighbor of shuffled) {
          if (added >= 2) break;
          const nId = hexId(neighbor.q, neighbor.r);
          if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
            hexes[nId].terrain = 'forest';
            hexes[nId].class = 'terrain-forest';
            occupied.add(nId);
            added++;
          }
        }
        return;
      }
    }
  }
}

/**
 * Find and fill large gaps (> 6 hexes) between terrain
 */
function fixLargeGaps(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  random: () => number
): void {
  // Scan the map for large open areas
  const checked = new Set<string>();
  
  for (let q = 0; q < columns; q++) {
    for (let r = 0; r < rows; r++) {
      const id = hexId(q, r);
      if (checked.has(id) || occupied.has(id)) continue;
      
      // Found an open hex - measure the gap
      const gapSize = measureGap(hexes, q, r, columns, rows, checked);
      
      if (gapSize.maxExtent > MAX_GAP_HEXES) {
        // This gap is too large - add terrain in the middle
        fillGap(hexes, occupied, gapSize.centerQ, gapSize.centerR, columns, rows, random);
      }
    }
  }
}

/**
 * Measure the extent of an open gap starting from a hex
 */
function measureGap(
  hexes: Record<string, HexData>,
  startQ: number,
  startR: number,
  columns: number,
  rows: number,
  checked: Set<string>
): { maxExtent: number; centerQ: number; centerR: number } {
  const openHexes: Array<{ q: number; r: number }> = [];
  const frontier = [{ q: startQ, r: startR }];
  
  let minQ = startQ, maxQ = startQ;
  let minR = startR, maxR = startR;
  
  // BFS to find all connected open hexes (limit search to avoid performance issues)
  while (frontier.length > 0 && openHexes.length < 100) {
    const current = frontier.shift()!;
    const id = hexId(current.q, current.r);
    
    if (checked.has(id)) continue;
    checked.add(id);
    
    const hex = hexes[id];
    if (!hex || hex.terrain !== 'open') continue;
    
    openHexes.push(current);
    minQ = Math.min(minQ, current.q);
    maxQ = Math.max(maxQ, current.q);
    minR = Math.min(minR, current.r);
    maxR = Math.max(maxR, current.r);
    
    // Add neighbors to frontier
    const neighbors = getValidNeighbors(current.q, current.r, columns, rows);
    for (const neighbor of neighbors) {
      const nId = hexId(neighbor.q, neighbor.r);
      if (!checked.has(nId)) {
        frontier.push(neighbor);
      }
    }
  }
  
  const extentQ = maxQ - minQ;
  const extentR = maxR - minR;
  const maxExtent = Math.max(extentQ, extentR);
  
  // Center of the gap
  const centerQ = Math.floor((minQ + maxQ) / 2);
  const centerR = Math.floor((minR + maxR) / 2);
  
  return { maxExtent, centerQ, centerR };
}

/**
 * Fill a large gap with terrain
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
  const id = hexId(centerQ, centerR);
  
  // Skip if already occupied
  if (occupied.has(id) || hexes[id]?.terrain !== 'open') {
    // Try to find a nearby open hex
    const neighbors = getValidNeighbors(centerQ, centerR, columns, rows);
    for (const neighbor of neighbors) {
      const nId = hexId(neighbor.q, neighbor.r);
      if (!occupied.has(nId) && hexes[nId]?.terrain === 'open') {
        centerQ = neighbor.q;
        centerR = neighbor.r;
        break;
      }
    }
  }
  
  // Pick a terrain type - prefer cover terrain for gap filling
  const terrainOptions = ['forest', 'ruins', 'rubble', 'barricade'];
  const terrainId = terrainOptions[Math.floor(random() * terrainOptions.length)];
  
  // Place a small cluster (2-4 hexes)
  const clusterSize = randomInt(2, 4, random);
  const placed = [{ q: centerQ, r: centerR }];
  
  hexes[hexId(centerQ, centerR)].terrain = terrainId;
  hexes[hexId(centerQ, centerR)].class = `terrain-${terrainId}`;
  occupied.add(hexId(centerQ, centerR));
  
  // Grow the cluster
  for (let i = 1; i < clusterSize; i++) {
    const lastHex = placed[placed.length - 1];
    const neighbors = getValidNeighbors(lastHex.q, lastHex.r, columns, rows);
    const shuffled = shuffleArray(neighbors, random);
    
    for (const neighbor of shuffled) {
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
// OPR TERRAIN MIX VALIDATION (rulebook lines 221-242)
// =============================================================================

/**
 * Validate and fix terrain type distribution per OPR guidelines:
 * - At least 50% of terrain should block LOS
 * - At least 33% should provide cover
 * - At least 33% should be difficult terrain
 */
function validateTerrainMix(
  hexes: Record<string, HexData>,
  occupied: Set<string>,
  columns: number,
  rows: number,
  config: GeneratorConfig,
  random: () => number
): void {
  // Count current terrain hexes by property
  let totalTerrainHexes = 0;
  let blockingHexes = 0;
  let coverHexes = 0;
  let difficultHexes = 0;
  
  for (const hex of Object.values(hexes)) {
    if (hex.terrain === 'open') continue;
    totalTerrainHexes++;
    
    const preset = TERRAIN_PRESETS[hex.terrain];
    if (!preset) continue;
    
    if (preset.losType === 'blocking' || preset.losType === 'partial') {
      blockingHexes++;
    }
    if (preset.properties.cover) {
      coverHexes++;
    }
    if (preset.properties.difficult) {
      difficultHexes++;
    }
  }
  
  // Calculate required counts based on OPR percentages
  const requiredBlocking = Math.ceil(totalTerrainHexes * config.terrainMix.blocking);
  const requiredCover = Math.ceil(totalTerrainHexes * config.terrainMix.cover);
  const requiredDifficult = Math.ceil(totalTerrainHexes * config.terrainMix.difficult);
  
  // Add more blocking terrain if needed (buildings, mountains)
  if (blockingHexes < requiredBlocking) {
    const deficit = requiredBlocking - blockingHexes;
    addTerrainOfType(hexes, occupied, columns, rows, 'blocking', deficit, random);
  }
  
  // Add more cover terrain if needed (forest, ruins, barricade)
  if (coverHexes < requiredCover) {
    const deficit = requiredCover - coverHexes;
    addTerrainOfType(hexes, occupied, columns, rows, 'cover', deficit, random);
  }
  
  // Add more difficult terrain if needed (rubble, swamp)
  if (difficultHexes < requiredDifficult) {
    const deficit = requiredDifficult - difficultHexes;
    addTerrainOfType(hexes, occupied, columns, rows, 'difficult', deficit, random);
  }
}

/**
 * Add terrain hexes of a specific type to meet OPR requirements
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
  // Select appropriate terrain presets for the type
  const placeableTerrains = getPlaceableTerrains();
  let candidates: string[];
  
  switch (terrainType) {
    case 'blocking':
      // Blocking LOS = blocking or partial
      candidates = placeableTerrains
        .filter(t => t.losType === 'blocking' || t.losType === 'partial')
        .map(t => t.id);
      break;
    case 'cover':
      candidates = placeableTerrains
        .filter(t => t.properties.cover)
        .map(t => t.id);
      break;
    case 'difficult':
      candidates = placeableTerrains
        .filter(t => t.properties.difficult)
        .map(t => t.id);
      break;
  }
  
  if (candidates.length === 0) return;
  
  // Find open hexes to place terrain
  let added = 0;
  const hexList = Object.values(hexes);
  const shuffledHexes = shuffleArray([...hexList], random);
  
  for (const hex of shuffledHexes) {
    if (added >= count) break;
    
    const id = hexId(hex.q, hex.r);
    if (hex.terrain !== 'open' || occupied.has(id)) continue;
    
    // Pick a random terrain from candidates
    const terrainId = candidates[Math.floor(random() * candidates.length)];
    
    hex.terrain = terrainId;
    hex.class = `terrain-${terrainId}`;
    occupied.add(id);
    added++;
    
    // Try to add 1-2 adjacent hexes to form a small cluster
    const neighbors = getValidNeighbors(hex.q, hex.r, columns, rows);
    const shuffledNeighbors = shuffleArray(neighbors, random);
    let clusterAdded = 0;
    
    for (const neighbor of shuffledNeighbors) {
      if (added >= count || clusterAdded >= 2) break;
      
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
