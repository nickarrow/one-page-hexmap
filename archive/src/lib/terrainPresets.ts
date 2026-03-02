import type { TerrainType } from '../types';

/**
 * Property-based terrain types
 * 
 * 10 terrain types covering all meaningful property combinations:
 * - open: No properties
 * - blocking: Can't enter, can't see through (buildings, mountains)
 * - impassable: Can't enter, CAN see through (deep water, chasms)
 * - cover: +1 Defense (barricades, rubble)
 * - difficult: Max 6" movement (mud, shallow water)
 * - dangerous: Terrain test on entry/activation (lava, minefields)
 * - cover-difficult: Cover + Difficult (forests, fields)
 * - cover-dangerous: Cover + Dangerous (toxic ruins)
 * - difficult-dangerous: Difficult + Dangerous (toxic swamp)
 * - cover-difficult-dangerous: All three (deadly jungle)
 */
export const TERRAIN_TYPES: Record<string, TerrainType> = {
  open: {
    id: 'open',
    properties: {
      cover: false,
      difficult: false,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    patternId: 'none',
  },

  blocking: {
    id: 'blocking',
    properties: {
      cover: false,
      difficult: false,
      dangerous: false,
      impassable: true,
      blocking: true,
    },
    patternId: 'pattern-blocking',
  },

  impassable: {
    id: 'impassable',
    properties: {
      cover: false,
      difficult: false,
      dangerous: false,
      impassable: true,
      blocking: false,
    },
    patternId: 'pattern-impassable',
  },

  cover: {
    id: 'cover',
    properties: {
      cover: true,
      difficult: false,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    patternId: 'pattern-cover',
  },

  difficult: {
    id: 'difficult',
    properties: {
      cover: false,
      difficult: true,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    patternId: 'pattern-difficult',
  },

  dangerous: {
    id: 'dangerous',
    properties: {
      cover: false,
      difficult: false,
      dangerous: true,
      impassable: false,
      blocking: false,
    },
    patternId: 'pattern-dangerous',
  },

  'cover-difficult': {
    id: 'cover-difficult',
    properties: {
      cover: true,
      difficult: true,
      dangerous: false,
      impassable: false,
      blocking: false,
    },
    patternId: 'pattern-cover-difficult',
  },

  'cover-dangerous': {
    id: 'cover-dangerous',
    properties: {
      cover: true,
      difficult: false,
      dangerous: true,
      impassable: false,
      blocking: false,
    },
    patternId: 'pattern-cover-dangerous',
  },

  'difficult-dangerous': {
    id: 'difficult-dangerous',
    properties: {
      cover: false,
      difficult: true,
      dangerous: true,
      impassable: false,
      blocking: false,
    },
    patternId: 'pattern-difficult-dangerous',
  },

  'cover-difficult-dangerous': {
    id: 'cover-difficult-dangerous',
    properties: {
      cover: true,
      difficult: true,
      dangerous: true,
      impassable: false,
      blocking: false,
    },
    patternId: 'pattern-cover-difficult-dangerous',
  },
};

/**
 * Get terrain types that block LOS
 */
export function getBlockingTerrains(): TerrainType[] {
  return Object.values(TERRAIN_TYPES).filter((t) => t.properties.blocking);
}

/**
 * Get terrain types that are impassable (includes blocking)
 */
export function getImpassableTerrains(): TerrainType[] {
  return Object.values(TERRAIN_TYPES).filter((t) => t.properties.impassable);
}

/**
 * Get terrain types that provide cover
 */
export function getCoverTerrains(): TerrainType[] {
  return Object.values(TERRAIN_TYPES).filter((t) => t.properties.cover);
}

/**
 * Get terrain types that are difficult
 */
export function getDifficultTerrains(): TerrainType[] {
  return Object.values(TERRAIN_TYPES).filter((t) => t.properties.difficult);
}

/**
 * Get terrain types that are dangerous
 */
export function getDangerousTerrains(): TerrainType[] {
  return Object.values(TERRAIN_TYPES).filter((t) => t.properties.dangerous);
}

/**
 * Get all placeable terrain types (excluding open)
 */
export function getPlaceableTerrains(): TerrainType[] {
  return Object.values(TERRAIN_TYPES).filter((t) => t.id !== 'open');
}

/**
 * Get terrain type ID from properties
 */
export function getTerrainIdFromProperties(props: {
  cover: boolean;
  difficult: boolean;
  dangerous: boolean;
  blocking: boolean;
  impassable: boolean;
}): string {
  if (props.blocking) return 'blocking';
  if (props.impassable) return 'impassable';
  
  const parts: string[] = [];
  if (props.cover) parts.push('cover');
  if (props.difficult) parts.push('difficult');
  if (props.dangerous) parts.push('dangerous');
  
  if (parts.length === 0) return 'open';
  return parts.join('-');
}

/**
 * Get display label for terrain (for tooltips)
 */
export function getTerrainLabel(terrainId: string): string {
  if (terrainId === 'open') return 'Open';
  if (terrainId === 'blocking') return 'Blocking';
  if (terrainId === 'impassable') return 'Impassable';
  
  // Convert kebab-case to Title Case with +
  return terrainId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' + ');
}
