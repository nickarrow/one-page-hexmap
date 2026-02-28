import { useRef, useEffect, useState } from 'preact/hooks';
import { generateMap } from '../lib/generator';
import { getAllPatterns } from '../lib/patterns';
import { coordToLabel } from '../lib/hexmath';
import type { GeneratorConfig, DisplayConfig } from '../types';
import type { LabelAttributes } from '../types/oi-hexmap';

interface Props {
  generatorConfig: GeneratorConfig;
  displayConfig: DisplayConfig;
}

export function MapCanvas({ generatorConfig, displayConfig }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [debouncedConfig, setDebouncedConfig] = useState(generatorConfig);

  // Debounce config changes to prevent rapid re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConfig(generatorConfig);
    }, 150);
    return () => clearTimeout(timer);
  }, [generatorConfig]);

  useEffect(() => {
    if (!containerRef.current || typeof OI === 'undefined') {
      console.error('OI.hexmap not loaded');
      return;
    }

    // Generate HexJSON from config
    const hexJson = generateMap(debouncedConfig);

    // Clear previous instance
    containerRef.current.innerHTML = '';

    // Create hexmap
    // Patterns are applied via CSS targeting hex classes (e.g., .terrain-forest)
    // This matches how oi.hexmap.js London 1895 example works
    new OI.hexmap(containerRef.current, {
      hexjson: hexJson,
      patterns: getAllPatterns(),
      label: {
        show: displayConfig.showCoordinates || displayConfig.showElevation,
        clip: true,
        format: (_txt: string, attr: LabelAttributes) => {
          const parts: string[] = [];
          if (displayConfig.showCoordinates) {
            // Use coordToLabel for clean "A1" format, not the full tooltip string
            parts.push(coordToLabel(attr.hex.q, attr.hex.r));
          }
          if (displayConfig.showElevation && attr.hex.elevation !== 0) {
            const sign = attr.hex.elevation > 0 ? '+' : '';
            parts.push(`${sign}${attr.hex.elevation}`);
          }
          return parts.join(' ');
        },
      },
    });

    // Add topographic contour lines after render
    // The hexmap library renders asynchronously, so we need to wait for hexes to appear
    if (displayConfig.showContours) {
      const container = containerRef.current;
      waitForHexesAndAddContours(container);
    }

    // Cleanup on unmount or config change
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [debouncedConfig, displayConfig]);

  return <div ref={containerRef} class="w-full h-full map-preview" id="hex-map" />;
}

/**
 * Wait for hexmap to finish rendering, then add contour lines.
 * The library renders asynchronously so we poll until hexes appear.
 */
function waitForHexesAndAddContours(container: HTMLElement, attempts = 0): void {
  const maxAttempts = 20; // 20 * 50ms = 1 second max wait
  const hexGroups = container.querySelectorAll('g.hex, g[role="cell"]');

  if (hexGroups.length > 0) {
    addContourLines(container);
  } else if (attempts < maxAttempts) {
    setTimeout(() => waitForHexesAndAddContours(container, attempts + 1), 50);
  }
}

/**
 * Add topographic contour lines to hexes based on elevation.
 * Creates inner hex outlines - one ring per elevation level.
 */
function addContourLines(container: HTMLElement): void {
  const hexGroups = container.querySelectorAll('.hex');

  hexGroups.forEach((hexGroup) => {
    // Check for elevation classes - SVG elements use className.baseVal
    const svgElement = hexGroup as SVGElement;
    const classes = svgElement.className?.baseVal || svgElement.getAttribute('class') || '';
    let elevation = 0;
    let isNegative = false;

    // Parse elevation from class
    const posMatch = classes.match(/elev-(\d+)/);
    const negMatch = classes.match(/elev-neg-(\d+)/);

    if (posMatch) {
      elevation = parseInt(posMatch[1], 10);
    } else if (negMatch) {
      elevation = parseInt(negMatch[1], 10);
      isNegative = true;
    }

    if (elevation === 0) return;

    // Get the hex path to extract its shape
    const hexPath = hexGroup.querySelector('path') as SVGPathElement | null;
    if (!hexPath) return;

    // Create contour lines - one for each elevation level
    for (let i = 1; i <= elevation; i++) {
      // Scale factor for inner hex (smaller for each level)
      const scale = 1 - i * 0.12; // 88%, 76%, 64%, 52% of original size

      // Create scaled hex path
      const contourPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      // Get original path data and transform it
      const originalD = hexPath.getAttribute('d');
      if (originalD) {
        const scaledD = scalePathAroundCenter(originalD, 0, 0, scale);
        contourPath.setAttribute('d', scaledD);
      }

      // Style the contour line - muted grey, slightly more transparent for inner rings
      // This keeps the greyscale aesthetic while showing elevation
      const opacity = isNegative ? 0.9 : 0.5;
      contourPath.setAttribute('fill', 'none');
      contourPath.setAttribute('stroke', '#666666');
      contourPath.setAttribute('stroke-opacity', String(opacity));
      contourPath.setAttribute('stroke-width', '1');
      contourPath.setAttribute('vector-effect', 'non-scaling-stroke');
      if (isNegative) {
        contourPath.setAttribute('stroke-dasharray', '4 2');
      }
      contourPath.setAttribute('class', 'contour-line');
      contourPath.setAttribute('pointer-events', 'none');

      // Insert before the label (if any) so contours appear under text
      const label = hexGroup.querySelector('.hex-label');
      if (label) {
        hexGroup.insertBefore(contourPath, label);
      } else {
        hexGroup.appendChild(contourPath);
      }
    }
  });
}

/**
 * Scale an SVG path around a center point.
 */
function scalePathAroundCenter(d: string, _cx: number, _cy: number, scale: number): string {
  // The hex paths from oi.hexmap use a simple format like:
  // "m0-60l51.96,30,0,60,-51.96,30,-51.96-30,0-60,51.96-30z" (relative coords)
  // The path is drawn relative to the hex's transform position (centered)

  // Simple approach: just scale all numbers in the path
  // This works because the hex is centered at its transform origin

  return d.replace(/-?[\d.]+/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    return (num * scale).toFixed(2);
  });
}
