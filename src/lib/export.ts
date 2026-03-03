/**
 * Export utilities for SVG and PNG download.
 */

import type { HexGrid, DisplayConfig, TerrainType } from './types';
import { TERRAIN_PROPERTIES } from './types';
import {
  HEX_WIDTH_PX,
  HEX_HEIGHT_RATIO,
  GRID_WIDTH_PX,
  GRID_HEIGHT_PX,
  GRID_COLUMNS,
  GRID_ROWS,
} from './constants';
import { generatePatternDefs, getPatternDef } from './patterns';
import { hexCenter, hexPoints, getUniqueTerrainTypes } from './hexUtils';
import { getTerrainDisplayName, getTerrainRuleText } from './patterns';

// Padding around the hex grid
const PADDING = 8;

// Total SVG dimensions including padding
const SVG_WIDTH = GRID_WIDTH_PX + PADDING * 2;
const SVG_HEIGHT = GRID_HEIGHT_PX + PADDING * 2;

// Hex height for calculations
const HEX_HEIGHT_PX = HEX_WIDTH_PX * HEX_HEIGHT_RATIO;

// PNG export scale factor (3x for high resolution)
const PNG_SCALE = 3;

/**
 * Get the base fill color for a terrain type.
 */
function getBaseFill(terrain: TerrainType): string {
  if (terrain === 'open') return '#ffffff';
  if (terrain === 'blocking') return '#1a1a1a';
  if (terrain === 'impassable') return '#e0e0e0';
  return '#ffffff';
}

/**
 * Generate hex polygon points for legend.
 */
function legendHexPoints(cx: number, cy: number, size: number): string {
  const h = size * HEX_HEIGHT_RATIO;
  const w = size / 2;
  const points = [
    [cx + w, cy],
    [cx + w / 2, cy + h / 2],
    [cx - w / 2, cy + h / 2],
    [cx - w, cy],
    [cx - w / 2, cy - h / 2],
    [cx + w / 2, cy - h / 2],
  ];
  return points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}


/**
 * Generate inline pattern SVG content for a hex.
 */
function generateInlinePatternSVG(
  terrain: TerrainType,
  centerX: number,
  centerY: number,
  clipId: string
): string {
  const def = getPatternDef(terrain);
  if (!def) return '';

  const left = centerX - HEX_WIDTH_PX / 2 - def.width;
  const top = centerY - HEX_HEIGHT_PX / 2 - def.height;
  const right = centerX + HEX_WIDTH_PX / 2 + def.width;
  const bottom = centerY + HEX_HEIGHT_PX / 2 + def.height;

  let tiles = '';
  for (let x = left; x < right; x += def.width) {
    for (let y = top; y < bottom; y += def.height) {
      tiles += `<g transform="translate(${x}, ${y})">${def.content}</g>`;
    }
  }

  return `<g clip-path="url(#${clipId})">${tiles}</g>`;
}

/**
 * Generate elevation contour SVG.
 */
function generateElevationContoursSVG(
  centerX: number,
  centerY: number,
  hexWidth: number,
  elevation: number
): string {
  const hexHeight = hexWidth * HEX_HEIGHT_RATIO;
  const absElev = Math.abs(elevation);
  const isNegative = elevation < 0;

  let contours = '';

  for (let i = 1; i <= absElev; i++) {
    const scale = 0.85 - ((i - 1) / Math.max(absElev, 1)) * 0.5;
    const w = (hexWidth / 2) * scale;
    const h = (hexHeight / 2) * scale;

    const points = [
      [centerX + w, centerY],
      [centerX + w / 2, centerY + h],
      [centerX - w / 2, centerY + h],
      [centerX - w, centerY],
      [centerX - w / 2, centerY - h],
      [centerX + w / 2, centerY - h],
    ];

    const pathData =
      points
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(2)},${p[1].toFixed(2)}`)
        .join(' ') + ' Z';

    const opacity = 0.5 + (i / absElev) * 0.3;
    const dashArray = isNegative ? 'stroke-dasharray="3,2"' : '';

    contours += `<path d="${pathData}" fill="none" stroke="#666" stroke-width="0.8" ${dashArray} opacity="${opacity}"/>`;
  }

  return contours;
}


/**
 * Get overlay legend name lines.
 */
function getOverlayName(terrain: TerrainType): string[] {
  const names: Record<TerrainType, string[]> = {
    open: ['Open'],
    blocking: ['Blocking'],
    impassable: ['Impassable'],
    cover: ['Cover'],
    difficult: ['Difficult'],
    dangerous: ['Dangerous'],
    'cover-difficult': ['Cover +', 'Difficult'],
    'cover-dangerous': ['Cover +', 'Dangerous'],
    'difficult-dangerous': ['Difficult +', 'Dangerous'],
    'cover-difficult-dangerous': ['Cover + Diff', '+ Dangerous'],
  };
  return names[terrain];
}

/**
 * Get overlay legend rule text.
 */
function getOverlayRule(terrain: TerrainType): string {
  const rules: Record<TerrainType, string> = {
    open: '',
    blocking: 'No LOS/move',
    impassable: 'No move',
    cover: '+1 Def',
    difficult: '3" max',
    dangerous: 'Wounds',
    'cover-difficult': '+1 Def, 3"',
    'cover-dangerous': '+1 Def, wounds',
    'difficult-dangerous': '3", wounds',
    'cover-difficult-dangerous': 'All effects',
  };
  return rules[terrain];
}

/**
 * Generate inline pattern SVG for legend hex.
 */
function generateLegendPatternSVG(
  terrain: TerrainType,
  cx: number,
  cy: number,
  size: number,
  clipId: string
): string {
  const def = getPatternDef(terrain);
  if (!def) return '';

  const hexHeight = size * HEX_HEIGHT_RATIO;
  const left = cx - size / 2 - def.width;
  const top = cy - hexHeight / 2 - def.height;
  const right = cx + size / 2 + def.width;
  const bottom = cy + hexHeight / 2 + def.height;

  let tiles = '';
  for (let x = left; x < right; x += def.width) {
    for (let y = top; y < bottom; y += def.height) {
      tiles += `<g transform="translate(${x}, ${y})">${def.content}</g>`;
    }
  }

  return `<g clip-path="url(#${clipId})">${tiles}</g>`;
}

/**
 * Generate a legend hex sample SVG.
 */
function generateHexSampleSVG(
  terrain: TerrainType,
  cx: number,
  cy: number,
  size: number,
  clipId: string
): string {
  const props = TERRAIN_PROPERTIES[terrain];
  const strokeColor = props.blocking ? '#000' : '#999';
  const baseFill = getBaseFill(terrain);
  const hasPattern = terrain !== 'open' && terrain !== 'blocking';
  const points = legendHexPoints(cx, cy, size);

  let svg = `<polygon points="${points}" fill="${baseFill}" stroke="${strokeColor}" stroke-width="0.5"/>`;

  if (hasPattern) {
    svg += generateLegendPatternSVG(terrain, cx, cy, size, clipId);
    svg += `<polygon points="${points}" fill="none" stroke="${strokeColor}" stroke-width="0.5"/>`;
  }

  return svg;
}


/**
 * Generate legend overlay SVG content.
 */
function generateLegendOverlaySVG(
  grid: HexGrid,
  svgHeight: number,
  position: 'right' | 'left'
): string {
  const terrainTypes = getUniqueTerrainTypes(grid);
  if (terrainTypes.length === 0) return '';

  const width = HEX_WIDTH_PX * 2.6;
  const hexSize = HEX_WIDTH_PX * 0.85;
  const hexHeight = hexSize * HEX_HEIGHT_RATIO;
  const padding = 4;
  const textOffset = hexSize / 2 + 4;
  const fontSize = HEX_WIDTH_PX * 0.24;
  const lineHeight = fontSize * 1.1;

  // Calculate row heights
  const rowHeights = terrainTypes.map((t) => {
    const lines = getOverlayName(t);
    const nameHeight = lines.length * lineHeight;
    const ruleHeight = fontSize * 0.75;
    return Math.max(hexHeight, nameHeight + ruleHeight) + 6;
  });

  const totalRowHeight = rowHeights.reduce((a, b) => a + b, 0);
  const height = padding * 2 + totalRowHeight + 14;
  const yOffset = (svgHeight - height) / 2;

  // Calculate Y positions
  let cumulativeY = padding + 14;
  const yPositions = rowHeights.map((h) => {
    const y = cumulativeY + h / 2;
    cumulativeY += h;
    return y;
  });

  // Position transform
  const xTransform = position === 'right' ? SVG_WIDTH - width - 2 : 2;

  // Build clip paths
  let clipPaths = '';
  terrainTypes.forEach((terrain, i) => {
    const y = yPositions[i];
    const hexCx = padding + hexSize / 2;
    const points = legendHexPoints(hexCx, y, hexSize);
    clipPaths += `<clipPath id="export-legend-clip-${terrain}"><polygon points="${points}"/></clipPath>`;
  });

  // Build entries
  let entries = '';
  terrainTypes.forEach((terrain, i) => {
    const y = yPositions[i];
    const hexCx = padding + hexSize / 2;
    const nameLines = getOverlayName(terrain);
    const rule = getOverlayRule(terrain);

    const totalTextHeight = nameLines.length * lineHeight + (rule ? fontSize * 0.75 : 0);
    const textStartY = y - totalTextHeight / 2 + lineHeight * 0.7;

    entries += `<g>`;
    entries += generateHexSampleSVG(terrain, hexCx, y, hexSize, `export-legend-clip-${terrain}`);

    // Name text
    entries += `<text x="${hexCx + textOffset}" font-size="${fontSize}" font-weight="600" font-family="Arial, sans-serif" fill="#333">`;
    nameLines.forEach((line, lineIdx) => {
      entries += `<tspan x="${hexCx + textOffset}" y="${textStartY + lineIdx * lineHeight}">${line}</tspan>`;
    });
    entries += `</text>`;

    // Rule text
    if (rule) {
      entries += `<text x="${hexCx + textOffset}" y="${textStartY + nameLines.length * lineHeight}" font-size="${fontSize * 0.75}" font-family="Arial, sans-serif" fill="#666">${rule}</text>`;
    }

    entries += `</g>`;
  });

  return `
    <g transform="translate(${xTransform}, ${yOffset})">
      <defs>${clipPaths}</defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="white" fill-opacity="0.95" stroke="#999" stroke-width="0.5" rx="2" ry="2"/>
      <text x="${width / 2}" y="${padding + 6}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif" fill="#333">TERRAIN</text>
      ${entries}
    </g>
  `;
}


/**
 * Generate the complete map SVG as a string.
 */
export function generateMapSVG(grid: HexGrid, seed: string, display: DisplayConfig): string {
  // Build clip paths for patterned hexes
  let clipPaths = '';
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const terrain = grid[col][row].terrain;
      if (terrain === 'open' || terrain === 'blocking') continue;

      const center = hexCenter(col, row, HEX_WIDTH_PX);
      const points = hexPoints(center.x, center.y, HEX_WIDTH_PX);
      clipPaths += `<clipPath id="clip-${col}-${row}"><polygon points="${points}"/></clipPath>`;
    }
  }

  // Build hex grid
  let hexes = '';
  for (let col = 0; col < GRID_COLUMNS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const hex = grid[col][row];
      const center = hexCenter(col, row, HEX_WIDTH_PX);
      const points = hexPoints(center.x, center.y, HEX_WIDTH_PX);
      const props = TERRAIN_PROPERTIES[hex.terrain];
      const baseFill = getBaseFill(hex.terrain);
      const hasPattern = hex.terrain !== 'open' && hex.terrain !== 'blocking';
      const strokeColor = props.blocking ? '#000' : '#999';

      hexes += `<g>`;
      hexes += `<polygon points="${points}" fill="${baseFill}" stroke="${strokeColor}" stroke-width="0.5"/>`;

      if (hasPattern) {
        hexes += generateInlinePatternSVG(hex.terrain, center.x, center.y, `clip-${col}-${row}`);
        hexes += `<polygon points="${points}" fill="none" stroke="${strokeColor}" stroke-width="0.5"/>`;
      }

      // Elevation contours
      if (hex.elevation !== 0 && !props.blocking && !props.impassable) {
        hexes += generateElevationContoursSVG(center.x, center.y, HEX_WIDTH_PX, hex.elevation);

        // Elevation label with background
        const labelW = HEX_WIDTH_PX * 0.44;
        const labelH = HEX_WIDTH_PX * 0.34;
        const labelX = center.x - labelW / 2;
        const labelY = center.y - labelH / 2;
        const labelText = hex.elevation > 0 ? `+${hex.elevation}` : `${hex.elevation}`;

        hexes += `<rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}" rx="2" ry="2" fill="white"/>`;
        hexes += `<text x="${center.x}" y="${center.y + 2}" text-anchor="middle" dominant-baseline="middle" font-size="${HEX_WIDTH_PX * 0.32}" font-family="Arial, sans-serif" font-weight="bold" fill="#333">${labelText}</text>`;
      }

      hexes += `</g>`;
    }
  }

  // Build border
  const border = display.showBorder
    ? `<rect x="2" y="2" width="${SVG_WIDTH - 4}" height="${SVG_HEIGHT - 4}" fill="none" stroke="#ccc" stroke-width="1"/>`
    : '';

  // Build seed watermark
  const seedWatermark = display.showSeed
    ? `<text x="${SVG_WIDTH - 6}" y="${SVG_HEIGHT - 6}" text-anchor="end" font-size="8" font-family="monospace" fill="#aaa">Seed: ${seed}</text>`
    : '';

  // Build legend overlay
  let legendOverlay = '';
  if (display.legendMode === 'overlay-right') {
    legendOverlay = generateLegendOverlaySVG(grid, SVG_HEIGHT, 'right');
  } else if (display.legendMode === 'overlay-left') {
    legendOverlay = generateLegendOverlaySVG(grid, SVG_HEIGHT, 'left');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" style="background-color: white;">
  <defs>
    ${generatePatternDefs()}
    ${clipPaths}
  </defs>
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="white"/>
  ${border}
  <g transform="translate(${PADDING}, ${PADDING})">
    ${hexes}
  </g>
  ${seedWatermark}
  ${legendOverlay}
</svg>`;
}


/**
 * Generate the legend page SVG as a string.
 */
export function generateLegendSVG(grid: HexGrid, seed: string): string {
  const terrainTypes = getUniqueTerrainTypes(grid);

  const pageWidth = 1017.6;
  const pageHeight = 777.6;
  const margin = 40;

  const hexSize = 36;
  const rowHeight = Math.max(hexSize * HEX_HEIGHT_RATIO + 12, 40);
  const colWidth = 320;

  const useColumns = terrainTypes.length > 5;
  const itemsPerCol = useColumns ? Math.ceil(terrainTypes.length / 2) : terrainTypes.length;

  // Build clip paths
  let clipPaths = '';
  terrainTypes.forEach((terrain, i) => {
    const col = useColumns ? Math.floor(i / itemsPerCol) : 0;
    const row = useColumns ? i % itemsPerCol : i;
    const x = col * colWidth + margin + 60;
    const y = row * rowHeight + rowHeight / 2 + margin + 80;
    const hexCx = x + hexSize / 2;
    const points = legendHexPoints(hexCx, y, hexSize);
    clipPaths += `<clipPath id="page-clip-${terrain}"><polygon points="${points}"/></clipPath>`;
  });

  // Build entries
  let entries = '';
  terrainTypes.forEach((terrain, i) => {
    const col = useColumns ? Math.floor(i / itemsPerCol) : 0;
    const row = useColumns ? i % itemsPerCol : i;
    const x = col * colWidth;
    const y = row * rowHeight + rowHeight / 2;
    const hexCx = hexSize / 2;

    entries += `<g transform="translate(${x}, ${y})">`;
    entries += generateHexSampleSVG(terrain, hexCx, 0, hexSize, `page-clip-${terrain}`);
    entries += `<text x="${hexCx + hexSize / 2 + 16}" y="-6" font-size="14" font-weight="600" font-family="Arial, sans-serif" fill="#333">${getTerrainDisplayName(terrain)}</text>`;
    entries += `<text x="${hexCx + hexSize / 2 + 16}" y="10" font-size="11" font-family="Arial, sans-serif" fill="#666">${getTerrainRuleText(terrain)}</text>`;
    entries += `</g>`;
  });

  const elevationY = margin + 80 + (itemsPerCol + 1) * rowHeight + 40;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageWidth} ${pageHeight}" width="${pageWidth}" height="${pageHeight}" style="background-color: white;">
  <defs>${clipPaths}</defs>
  <rect width="${pageWidth}" height="${pageHeight}" fill="white"/>
  <text x="${pageWidth / 2}" y="${margin + 20}" text-anchor="middle" font-size="24" font-weight="bold" font-family="Arial, sans-serif" fill="#333">Terrain Legend</text>
  <text x="${pageWidth / 2}" y="${margin + 45}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#666">OPR Hex Battle Map • Seed: ${seed}</text>
  <g transform="translate(${margin + 60}, ${margin + 80})">
    ${entries}
  </g>
  <g transform="translate(${margin + 60}, ${elevationY})">
    <text x="0" y="0" font-size="14" font-weight="bold" font-family="Arial, sans-serif" fill="#333">Elevation</text>
    <text x="0" y="20" font-size="11" font-family="Arial, sans-serif" fill="#666">+N = raised (solid contours) • −N = lowered (dashed contours)</text>
    <text x="0" y="36" font-size="11" font-family="Arial, sans-serif" fill="#666">±1 level = climbable (extra movement) • ±2+ levels = impassable</text>
  </g>
  <text x="${pageWidth / 2}" y="${pageHeight - margin}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="#999">Generated with OPR Hex Battle Map Generator</text>
</svg>`;
}


/**
 * Trigger a file download.
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export SVG string as a file download.
 */
export function exportSVG(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadFile(blob, filename);
}

/**
 * Convert SVG string to PNG and download.
 */
export function exportPNG(svgString: string, filename: string, scale: number = PNG_SCALE): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get canvas context'));
        return;
      }

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw scaled SVG
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          downloadFile(blob, filename);
          resolve();
        } else {
          reject(new Error('Could not create PNG blob'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load SVG image'));
    };

    img.src = url;
  });
}

/**
 * Export map (and optionally legend) based on current display settings.
 */
export async function exportMap(
  grid: HexGrid,
  seed: string,
  display: DisplayConfig,
  format: 'svg' | 'png'
): Promise<void> {
  const baseFilename = `opr-battlemap-${seed}`;
  const mapSvg = generateMapSVG(grid, seed, display);

  if (format === 'svg') {
    exportSVG(mapSvg, `${baseFilename}.svg`);

    // Export separate legend if in separate mode
    if (display.legendMode === 'separate') {
      const legendSvg = generateLegendSVG(grid, seed);
      exportSVG(legendSvg, `${baseFilename}-legend.svg`);
    }
  } else {
    await exportPNG(mapSvg, `${baseFilename}.png`);

    // Export separate legend if in separate mode
    if (display.legendMode === 'separate') {
      const legendSvg = generateLegendSVG(grid, seed);
      await exportPNG(legendSvg, `${baseFilename}-legend.png`);
    }
  }
}
