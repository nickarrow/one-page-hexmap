import { useRef, useEffect, useState } from 'preact/hooks';
import { generateMap } from '../lib/generator';
import { renderHexMap } from '../lib/hexRenderer';
import type { GeneratorConfig, DisplayConfig } from '../types';

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
    if (!containerRef.current) return;

    // Generate HexJSON from config
    const hexJson = generateMap(debouncedConfig);

    // Render to SVG using our simple renderer
    const svgString = renderHexMap(hexJson, {
      showCoordinates: displayConfig.showCoordinates,
      showElevation: displayConfig.showElevation,
      showContours: displayConfig.showContours,
    });

    // Insert SVG into container
    containerRef.current.innerHTML = svgString;

  }, [debouncedConfig, displayConfig]);

  return <div ref={containerRef} class="w-full h-full map-preview" id="hex-map" />;
}
