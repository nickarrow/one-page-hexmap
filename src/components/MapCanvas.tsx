import { useRef, useEffect } from 'preact/hooks';
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

  useEffect(() => {
    if (!containerRef.current || typeof OI === 'undefined') {
      console.error('OI.hexmap not loaded');
      return;
    }

    // Generate HexJSON from config
    const hexJson = generateMap(generatorConfig);

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

    // Cleanup on unmount or config change
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [generatorConfig, displayConfig]);

  return <div ref={containerRef} class="w-full h-full map-preview" id="hex-map" />;
}
