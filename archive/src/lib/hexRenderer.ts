/**
 * Simple hex renderer - replaces oi.hexmap.js
 * 
 * Renders hexes directly to SVG using the same approach as pattern-additive-test.html.
 * This gives us full control over the coordinate system and pattern rendering.
 */

import type { HexJSON, HexData } from '../types';
import { TERRAIN_PATTERNS } from './patterns';
import { coordToLabel } from './hexmath';

// =============================================================================
// HEX GEOMETRY (flat-topped, odd-q offset)
// =============================================================================

/**
 * Hex dimensions for flat-topped hexes
 * Flat edges at top and bottom, vertices on left and right
 */
const HEX_SIZE = 32; // Reference size
const HEX_WIDTH = HEX_SIZE;  // Point to point (left vertex to right vertex)
const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3) / 2; // ~27.7, flat edge to flat edge

/** Horizontal spacing between hex centers (3/4 of width for flat-topped) */
const HEX_HORIZ = HEX_WIDTH * 0.75;

/** Vertical spacing between hex centers (full height for flat-topped) */
const HEX_VERT = HEX_HEIGHT;

/**
 * Generate the points string for a flat-topped hexagon centered at (0,0)
 */
function getHexPoints(): string {
  const w = HEX_WIDTH / 2;   // Half width (to vertex)
  const h = HEX_HEIGHT / 2;  // Half height (to flat edge)
  const qw = w / 2;          // Quarter width
  
  // Flat-topped hex: flat edges at top and bottom
  return [
    `${-qw},${-h}`,    // top-left
    `${qw},${-h}`,     // top-right
    `${w},0`,          // right vertex
    `${qw},${h}`,      // bottom-right
    `${-qw},${h}`,     // bottom-left
    `${-w},0`,         // left vertex
  ].join(' ');
}

/**
 * Calculate pixel position for a hex at grid coordinates (q, r)
 * Using odd-q offset: odd columns are shifted down by half a hex height
 */
function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = q * HEX_HORIZ;
  const y = r * HEX_VERT + (q % 2 === 1 ? HEX_VERT / 2 : 0);
  return { x, y };
}

// =============================================================================
// SVG GENERATION
// =============================================================================

export interface RenderOptions {
  showCoordinates: boolean;
  showElevation: boolean;
  showContours: boolean;
}

/**
 * Render a hex map to an SVG string
 */
export function renderHexMap(hexJson: HexJSON, options: RenderOptions): string {
  const hexes = Object.values(hexJson.hexes);
  if (hexes.length === 0) return '<svg></svg>';

  // Calculate bounds
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const hex of hexes) {
    const pos = hexToPixel(hex.q, hex.r);
    minX = Math.min(minX, pos.x - HEX_WIDTH / 2);
    maxX = Math.max(maxX, pos.x + HEX_WIDTH / 2);
    minY = Math.min(minY, pos.y - HEX_HEIGHT / 2);
    maxY = Math.max(maxY, pos.y + HEX_HEIGHT / 2);
  }

  // Add padding
  const padding = 2;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  // Build SVG
  const parts: string[] = [];

  // SVG header with viewBox
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}" class="hex-map-svg">`);

  // Defs section with patterns
  parts.push('<defs>');
  parts.push(Object.values(TERRAIN_PATTERNS).join('\n'));
  parts.push('</defs>');

  // Hex points (reused for all hexes)
  const hexPoints = getHexPoints();

  // Render each hex
  for (const hex of hexes) {
    parts.push(renderHex(hex, hexPoints, options));
  }

  parts.push('</svg>');

  return parts.join('\n');
}

/**
 * Render a single hex
 */
function renderHex(hex: HexData, hexPoints: string, options: RenderOptions): string {
  const pos = hexToPixel(hex.q, hex.r);
  const parts: string[] = [];

  // Group for this hex
  const classes = ['hex'];
  if (hex.class) classes.push(hex.class);
  
  parts.push(`<g class="${classes.join(' ')}" transform="translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})" data-q="${hex.q}" data-r="${hex.r}">`);

  // Hex polygon
  const fill = getTerrainFill(hex.terrain);
  parts.push(`<polygon points="${hexPoints}" fill="${fill}" stroke="#999" stroke-width="0.5">`);
  parts.push(`<title>${hex.n}</title>`);
  parts.push('</polygon>');

  // Contour lines for elevation
  if (options.showContours && hex.elevation !== 0) {
    parts.push(renderContours(hex.elevation, hexPoints));
  }

  // Label (coordinates and/or elevation)
  if (options.showCoordinates || options.showElevation) {
    const labelParts: string[] = [];
    if (options.showCoordinates) {
      labelParts.push(coordToLabel(hex.q, hex.r));
    }
    if (options.showElevation && hex.elevation !== 0) {
      const sign = hex.elevation > 0 ? '+' : '';
      labelParts.push(`${sign}${hex.elevation}`);
    }
    if (labelParts.length > 0) {
      parts.push(`<text class="hex-label" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="bold" fill="#333">${labelParts.join(' ')}</text>`);
    }
  }

  parts.push('</g>');

  return parts.join('');
}

/**
 * Get the fill value for a terrain type
 */
function getTerrainFill(terrainId: string): string {
  if (terrainId === 'open') return '#ffffff';
  if (terrainId === 'blocking') return '#1a1a1a';
  if (TERRAIN_PATTERNS[terrainId]) return `url(#pattern-${terrainId})`;
  return '#ffffff';
}

/**
 * Render contour lines for elevation
 */
function renderContours(elevation: number, hexPoints: string): string {
  const absElev = Math.abs(elevation);
  const isNegative = elevation < 0;
  const parts: string[] = [];

  for (let i = 1; i <= absElev; i++) {
    const scale = 1 - i * 0.12;
    const scaledPoints = scaleHexPoints(hexPoints, scale);
    const opacity = isNegative ? 0.9 : 0.5;
    const dashArray = isNegative ? 'stroke-dasharray="2 1"' : '';
    
    parts.push(`<polygon points="${scaledPoints}" fill="none" stroke="#666" stroke-width="0.5" stroke-opacity="${opacity}" ${dashArray} class="contour-line"/>`);
  }

  return parts.join('');
}

/**
 * Scale hex points around center (0,0)
 */
function scaleHexPoints(points: string, scale: number): string {
  return points.split(' ').map(point => {
    const [x, y] = point.split(',').map(Number);
    return `${(x * scale).toFixed(1)},${(y * scale).toFixed(1)}`;
  }).join(' ');
}
