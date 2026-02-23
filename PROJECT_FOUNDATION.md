# OPR Hex Battle Map Generator

## Project Overview

A web-based tool for generating, visualizing, and printing One Page Rules (OPR)–compatible hex battle maps. Maps are procedurally generated, monochrome, print-friendly, and designed to fit on a single US Letter (or A4) page with physical unit tokens.

## Primary Audience

OPR tabletop wargamers who need to rapidly produce balanced, valid battle maps without manual drawing.

## Core Value Proposition

- Procedurally generated hex maps aligned with OPR terrain and battle map designs
- Print-ready output on a single page
- Clear visual representation of terrain types and elevations
- Designed for 7mm diameter unit tokens
- Monochrome styling optimized for printing (inspired by classic hex-and-counter wargames)
- Shareable maps via seed-based regeneration

---

## Local Reference Materials

The following resources have been cloned locally for reference during development:

### oi.hexmap.js (Cloned)

**Location:** `oi.hexmap.js/`

The core hex rendering library we're building on top of.

```
oi.hexmap.js/
├── dist/
│   ├── oi.hexmap.js          # Full source (26.3KB) - READ THIS for API understanding
│   └── oi.hexmap.min.js      # Minified (16.1KB) - COPY THIS to public/lib/
├── index.html                # Documentation & examples - OPEN IN BROWSER for demos
├── resources/
│   ├── constituencies.hexjson        # Example HexJSON layout
│   └── uk-constituencies-2023.hexjson # Example with boundaries
├── LICENSE                   # MIT License
└── README.md                 # Changelog
```

**Key files to reference:**
- `dist/oi.hexmap.js` — Full annotated source code, useful for understanding the API
- `index.html` — Open in browser to see all examples including London 1895
- `resources/*.hexjson` — Example HexJSON files showing format and boundaries

### Related Projects (Not Cloned)

These exist online but weren't cloned because they're for geographic cartograms, not procedural game maps:

| Project | URL | Why Not Cloned |
|---------|-----|----------------|
| odileeds/hexmaps | https://github.com/odileeds/hexmaps | Pre-made geographic layouts (UK, US), not game grids |
| Hex map builder | https://odileeds.github.io/hexmaps/builder.html | CSV import tool, not relevant to procedural generation |
| Hex map editor | https://odileeds.github.io/hexmaps/editor/ | Manual positioning UI — could reference later for click-to-edit feature |

**Note:** If we add a "click to edit hex terrain" feature in the future, the editor UI at `odileeds.github.io/hexmaps/editor/` would be a good reference for interaction patterns.

---

## Grid Specifications

### Design Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Grid size | 36 × 24 hexes | Mirrors OPR's 72" × 48" table at half scale |
| Token diameter | 7mm | Physical tokens already purchased |
| Page size | US Letter (primary), A4 (secondary) | Common printer paper |
| Hex orientation | Flat-topped (odd-q layout) | Best fit for portrait page |
| Page orientation | Portrait | Maximizes hex size for 36×24 grid |
| Margins | 0.20" (5.08mm) | Minimal safe margin for most printers |

### Hex Geometry Math

**Flat-topped hex relationships:**
- Hex width (flat-to-flat) = `w`
- Hex height (point-to-point) = `w × 1.1547`
- Horizontal spacing = `w × 0.75` (hexes interlock)
- Vertical spacing = hex height

**Grid dimensions formula:**
- Total width = `w + (columns - 1) × 0.75w` = `w × (1 + 0.75 × (columns - 1))`
- Total height = `rows × hex_height` = `rows × w × 1.1547`

For 36 columns: `total_width = 27.25w`
For 24 rows: `total_height = 27.71w`

### Calculated Hex Sizes

**US Letter Portrait (279.4mm × 215.9mm):**
```
Printable area: 205.74mm × 269.24mm (with 0.20" margins)

Width constraint:  27.25w = 205.74mm → w = 7.55mm
Height constraint: 27.71w = 269.24mm → w = 9.72mm

Limiting factor: Width
Result: w = 7.55mm hex width, 8.72mm hex height
```

**A4 Portrait (210mm × 297mm):**
```
Printable area: 199.84mm × 286.84mm (with 0.20" margins)

Width constraint:  27.25w = 199.84mm → w = 7.33mm
Height constraint: 27.71w = 286.84mm → w = 10.35mm

Limiting factor: Width
Result: w = 7.33mm hex width, 8.47mm hex height
```

### Token Fit Analysis

| Paper | Hex Width | Stroke Width | Interior Space | 7mm Token Fit |
|-------|-----------|--------------|----------------|---------------|
| US Letter | 7.55mm | 0.5mm | ~7.05mm | ✓ 0.05mm clearance |
| A4 | 7.33mm | 0.5mm | ~6.83mm | ✓ Snug but works |

The minimal clearance is intentional — tokens visually "fill" their hex, which is the classic hex-and-counter wargame aesthetic.

---

## Visual Design

### Style Reference: London 1895 Hexmap

The visual design is inspired by the [London 1895 hexmap](https://open-innovations.github.io/oi.hexmap.js/#ex4) from the British Library, recreated in the oi.hexmap.js examples. This vintage cartographic style translates well to print-friendly wargame maps.

**Key visual characteristics:**
- Parchment/sepia background for screen preview (`#fdf4d6`)
- Pure white background for print
- Bold hex outlines with consistent stroke width (`3px` on screen, `0.5mm` print)
- Hatch patterns to differentiate regions (horizontal vs vertical lines)
- Serif typography for hex labels (Times New Roman)
- Text shadows for legibility over patterns
- Circular border framing the map (optional decorative element)

**Reference implementation from oi.hexmap.js:**

```css
/* London 1895 style - adapted for OPR battle maps */
.map-preview {
  font-family: "Times New Roman", serif;
  background-color: #fdf4d6;  /* Parchment - screen only */
  color: #656058;
}

.hex path {
  stroke: #656058;
  stroke-width: 3px;
}

.hex-label {
  font-weight: 700;
  fill: #656058;
  /* Text shadow for legibility over patterns */
  text-shadow: 
    2px 2px 1px #fdf4d6,
    -2px 2px 1px #fdf4d6,
    -2px -2px 1px #fdf4d6,
    2px -2px 1px #fdf4d6;
}

/* Hover state - inverts colors */
.hex.hover path {
  transform: scale(1.1);
  stroke: black;
}

.hex.hover .hex-label {
  text-shadow: none;
  fill: #fdf4d6;
}
```

**Pattern definitions from London 1895 example:**

```javascript
// Vertical and horizontal line patterns used in the original
patterns: [
  `<pattern id="verticalHatch" patternUnits="userSpaceOnUse" width="8" height="8">
    <path d="M0,0 l0,8 M4,0 l0,8" style="stroke:#656058;stroke-width:8;opacity:0.3;" />
  </pattern>`,
  `<pattern id="horizontalHatch" patternUnits="userSpaceOnUse" width="8" height="8">
    <path d="M0,0 l8,0 M0,4 l8,0" style="stroke:#656058;stroke-width:8;opacity:0.3;" />
  </pattern>`
]
```

**Applying patterns via CSS classes:**

```css
/* Each hex gets a class, pattern applied via CSS */
.data-layer .hex path {
  fill: #fdf4d6;  /* Base fill */
}

.data-layer .terrain-cover path {
  fill: url(#pattern-cover);
}

.data-layer .terrain-difficult path {
  fill: url(#pattern-difficult);
}
```

**Label formatting with multi-line support:**

```javascript
// Custom label formatter from London 1895 example
label: {
  show: true,
  format: function(txt, attr) {
    let tspans = '';
    // Split label by <br> tags for multi-line
    const lines = attr.hex.label ? attr.hex.label.split(/<br ?\/?>/): [txt];
    const lineHeight = attr['font-size'] * 1.5;
    
    for (let i = 0; i < lines.length; i++) {
      const yOffset = (i - lines.length / 2 + 0.5) * lineHeight;
      tspans += `<tspan class="name" y="${yOffset.toFixed(1)}" x="0">${lines[i]}</tspan>`;
    }
    return tspans;
  }
}
```

### Adaptation for OPR Battle Maps

We adapt the London 1895 aesthetic for wargaming:

| London 1895 | OPR Battle Map |
|-------------|----------------|
| Horizontal/vertical hatches for regions | Diagonal/dot/cross hatches for terrain types |
| Place names as labels | Coordinate labels + elevation |
| Decorative circular border | Clean rectangular print area |
| Sepia color scheme | Monochrome for printing |
| Interactive hover effects | Print-focused, minimal interactivity |

### Terrain Types (OPR Aligned)

| Terrain | OPR Game Effect | Visual Pattern | CSS Class | Pattern Density |
|---------|-----------------|----------------|-----------|-----------------|
| Open | No special effect | White fill, no pattern | `.terrain-open` | None |
| Cover | +1 Defense when targeted | Light diagonal hatch (45°) | `.terrain-cover` | Light (30% opacity) |
| Difficult | Half movement speed | Sparse dot grid | `.terrain-difficult` | Medium spacing |
| Impassable | Cannot enter | Dense diagonal hatch | `.terrain-impassable` | Heavy (70% opacity) |
| Dangerous | Roll for damage when entering | Cross hatch (X pattern) | `.terrain-dangerous` | Medium, distinctive |

**Pattern design principles:**
- Patterns must be visually distinct at small hex sizes (7.5mm)
- Density increases with terrain severity (Open → Impassable)
- Cross hatch reserved for Dangerous to signal "caution"
- All patterns use single color (#333) for clean monochrome printing

### Elevation/Depth Labels

- Numeric label inside hex: `+1`, `+2`, `-1`, `-2`, etc.
- Displayed below coordinate label (if both enabled)
- Elevation `0` is not displayed (implicit ground level)
- Optional toggle in UI
- Font size scales with hex size to remain legible

**Elevation in OPR:**
- Higher elevation = advantage when shooting down
- Lower elevation = disadvantage when shooting up
- Typical range: -2 (deep depression) to +3 (high ground)

### SVG Pattern Definitions

These patterns are injected into the SVG `<defs>` section and referenced via `fill: url(#pattern-id)`.

```svg
<defs>
  <!-- 
    Pattern Design Notes:
    - patternUnits="userSpaceOnUse" ensures consistent pattern size regardless of hex size
    - Small pattern tiles (3-5px) create fine textures that print well
    - Stroke width kept thin (0.5-1px) for clarity at small sizes
    - #333 color provides good contrast without being harsh
  -->

  <!-- Diagonal hatch for Cover - light, 45° lines -->
  <pattern id="pattern-cover" patternUnits="userSpaceOnUse" width="4" height="4">
    <path d="M0,4 l4,-4 M-1,1 l2,-2 M3,5 l2,-2" 
          stroke="#333" stroke-width="0.5" fill="none" opacity="0.3"/>
  </pattern>
  
  <!-- Dot pattern for Difficult - evenly spaced dots -->
  <pattern id="pattern-difficult" patternUnits="userSpaceOnUse" width="5" height="5">
    <circle cx="2.5" cy="2.5" r="0.8" fill="#333" opacity="0.5"/>
  </pattern>
  
  <!-- Dense hatch for Impassable - tight 45° lines -->
  <pattern id="pattern-impassable" patternUnits="userSpaceOnUse" width="3" height="3">
    <path d="M0,3 l3,-3 M-0.5,0.5 l1,-1 M2.5,3.5 l1,-1" 
          stroke="#333" stroke-width="1" fill="none" opacity="0.7"/>
  </pattern>
  
  <!-- Cross hatch for Dangerous - X pattern -->
  <pattern id="pattern-dangerous" patternUnits="userSpaceOnUse" width="4" height="4">
    <path d="M0,0 l4,4 M4,0 l-4,4" 
          stroke="#333" stroke-width="0.5" fill="none" opacity="0.5"/>
  </pattern>
</defs>
```

**Pattern as TypeScript constant:**

```typescript
// lib/patterns.ts
export const SVG_PATTERNS = {
  cover: `<pattern id="pattern-cover" patternUnits="userSpaceOnUse" width="4" height="4">
    <path d="M0,4 l4,-4 M-1,1 l2,-2 M3,5 l2,-2" stroke="#333" stroke-width="0.5" fill="none" opacity="0.3"/>
  </pattern>`,
  
  difficult: `<pattern id="pattern-difficult" patternUnits="userSpaceOnUse" width="5" height="5">
    <circle cx="2.5" cy="2.5" r="0.8" fill="#333" opacity="0.5"/>
  </pattern>`,
  
  impassable: `<pattern id="pattern-impassable" patternUnits="userSpaceOnUse" width="3" height="3">
    <path d="M0,3 l3,-3 M-0.5,0.5 l1,-1 M2.5,3.5 l1,-1" stroke="#333" stroke-width="1" fill="none" opacity="0.7"/>
  </pattern>`,
  
  dangerous: `<pattern id="pattern-dangerous" patternUnits="userSpaceOnUse" width="4" height="4">
    <path d="M0,0 l4,4 M4,0 l-4,4" stroke="#333" stroke-width="0.5" fill="none" opacity="0.5"/>
  </pattern>`,
} as const;

export const ALL_PATTERNS = Object.values(SVG_PATTERNS);
```

---

## Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.x | Type-safe development, better tooling |
| Vite | 5.x | Fast dev server, optimized builds, easy deployment |
| Preact | 10.x | Lightweight reactive UI (~3KB gzipped) |
| Tailwind CSS | 3.x | Utility-first styling, consistent design |
| oi.hexmap.js | 0.8.4 | SVG hex rendering engine (MIT license) |

### Why This Stack?

**TypeScript over JavaScript:**
- Catches bugs at compile time (typos in config objects, wrong parameter types)
- Better editor autocomplete and inline documentation
- Structured data (hex configs, terrain types, HexJSON) benefits from type definitions
- Industry standard skill worth developing

**Preact over vanilla JS:**
- Automatic UI updates when state changes (terrain sliders, toggles, regenerate)
- Component-based organization keeps code manageable
- Only 3KB gzipped — negligible bundle impact
- React-compatible JSX syntax — transferable knowledge

**Preact over React:**
- Much smaller bundle (3KB vs 40KB+)
- Same developer experience and patterns
- More than sufficient for this project's complexity

**Tailwind over custom CSS:**
- Rapid UI development with utility classes
- Consistent spacing, colors, and typography out of the box
- Works seamlessly with Preact/JSX
- Print styles and SVG patterns still use custom CSS where needed

**oi.hexmap.js:**
- Purpose-built for hex cartograms with SVG output
- Supports HexJSON format (standard for hex layouts)
- Built-in pattern support via `<defs>`
- CSS class assignment per hex for terrain styling
- Boundary/edge drawing for roads, rivers, deployment zones
- MIT licensed, actively maintained
- Already cloned to `oi.hexmap.js/` in this workspace

### Deployment

**GitHub Pages via Vite:**

1. Configure base path in `vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: '/opr-hex-generator/',  // Replace with your repo name
     // ... other config
   });
   ```

2. Build produces static files in `dist/`

3. GitHub Actions workflow handles automatic deployment on push to main

**Workflow file (`.github/workflows/deploy.yml`):**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## Architecture

```
opr-hex-generator/
├── index.html                   # Entry HTML (loads oi.hexmap.js via script tag)
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── package.json
│
├── src/
│   ├── main.tsx                 # App entry point, renders to #app
│   ├── app.tsx                  # Root component, manages global state
│   │
│   ├── components/
│   │   ├── MapCanvas.tsx        # Hexmap container, integrates oi.hexmap.js
│   │   ├── ControlPanel.tsx     # Settings sidebar wrapper
│   │   ├── TerrainSliders.tsx   # Terrain weight sliders (5 sliders, sum to 100%)
│   │   ├── ToggleGroup.tsx      # Boolean toggles (elevation, coordinates, etc.)
│   │   ├── SeedInput.tsx        # Seed text input for reproducible maps
│   │   └── ExportButtons.tsx    # Print, SVG download, share URL buttons
│   │
│   ├── lib/
│   │   ├── generator.ts         # Procedural map generation algorithm
│   │   ├── terrain.ts           # Terrain type definitions, default weights
│   │   ├── patterns.ts          # SVG pattern string constants
│   │   ├── hexmath.ts           # Hex coordinate utilities (q,r to label, etc.)
│   │   ├── random.ts            # Seeded random number generator
│   │   └── export.ts            # SVG serialization, print trigger
│   │
│   ├── types/
│   │   ├── index.ts             # Shared type definitions (TerrainType, MapConfig, etc.)
│   │   └── oi-hexmap.d.ts       # TypeScript declarations for oi.hexmap.js
│   │
│   └── styles/
│       ├── index.css            # Tailwind directives + base styles
│       ├── map.css              # Hex styling, patterns, London 1895 aesthetic
│       └── print.css            # Print-specific overrides (@media print)
│
├── public/
│   └── lib/
│       └── oi.hexmap.min.js     # Hexmap library (copied from cloned repo)
│
└── .github/
    └── workflows/
        └── deploy.yml           # GitHub Pages deployment workflow
```

### Key File Responsibilities

| File | Responsibility |
|------|----------------|
| `app.tsx` | Holds `MapConfig` state, passes to children, handles regenerate |
| `MapCanvas.tsx` | Creates/destroys `OI.hexmap` instance when config changes |
| `generator.ts` | Pure function: `(config, seed) → HexJSON` |
| `random.ts` | Seedable PRNG for reproducible terrain distribution |
| `oi-hexmap.d.ts` | Makes TypeScript aware of the `OI.hexmap` global |

---

## Type Definitions

### Core Types

```typescript
// types/index.ts

export type TerrainType = 'open' | 'cover' | 'difficult' | 'impassable' | 'dangerous';

export type HexLayout = 'odd-q' | 'even-q' | 'odd-r' | 'even-r';

export interface HexData {
  q: number;
  r: number;
  n: string;                    // Display name (coordinate label)
  terrain: TerrainType;
  elevation?: number;           // -2 to +3 typically
  class?: string;               // CSS classes
  objective?: boolean;          // Control point marker
}

export interface TerrainWeights {
  open: number;
  cover: number;
  difficult: number;
  impassable: number;
  dangerous: number;
}

export interface MapConfig {
  columns: number;
  rows: number;
  layout: HexLayout;
  seed: string;
  terrainWeights: TerrainWeights;
  elevationEnabled: boolean;
  elevationRange: { min: number; max: number };
  elevationProbability: number;
  objectiveCount: number;
  showCoordinates: boolean;
  showElevation: boolean;
  mapTitle: string;
}

export interface HexJSON {
  layout: HexLayout;
  hexes: Record<string, HexData>;
  boundaries?: Record<string, {
    edges: Array<{ q: number; r: number; e: number }>;
  }>;
}

export interface PrintConfig {
  pageSize: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  margins: number;              // in inches
}
```

### oi.hexmap.js Type Declarations

```typescript
// types/oi-hexmap.d.ts

declare namespace OI {
  interface HexmapOptions {
    hexjson: HexJSON | string;
    patterns?: string[];
    label?: {
      show?: boolean;
      clip?: boolean;
      format?: (txt: string, attr: LabelAttributes) => string;
    };
    tooltip?: {
      format?: (txt: string, attr: LabelAttributes) => string;
    };
    grid?: {
      show?: boolean;
    };
    style?: {
      default?: HexStyle;
      highlight?: Partial<HexStyle>;
      selected?: Partial<HexStyle>;
    };
    ready?: (this: Hexmap) => void;
  }

  interface HexStyle {
    fill: string;
    'fill-opacity': number;
    stroke: string;
    'stroke-width': number;
    'stroke-opacity': number;
    'font-size': number;
  }

  interface LabelAttributes {
    hex: HexData;
    size: number;
    'font-size': number;
    'line-height'?: number;
    x: number;
    y: number;
  }

  interface HexArea {
    data: HexData;
    hex: SVGGElement;
    path: SVGPathElement;
    label?: SVGTextElement;
    fillcolour: string;
    selected: boolean;
    active: boolean;
    hover: boolean;
  }

  class Hexmap {
    constructor(el: HTMLElement, options?: HexmapOptions);
    version: string;
    el: HTMLElement;
    areas: Record<string, HexArea>;
    mapping: HexJSON;
    
    load(file: string | HexJSON, callback?: () => void): this;
    updateColours(fn?: (region: string) => string): this;
    updateLabels(labelKey?: string, tooltipKey?: string): this;
    updateBoundaries(fn?: (name: string, props: any) => Partial<HexStyle>): this;
    on(event: 'mouseover' | 'mouseout' | 'click', callback: (e: HexEvent) => void): this;
    setClass(fn: (region: string, area: HexArea) => void): this;
  }

  interface HexEvent {
    data: {
      hexmap: Hexmap;
      region: string;
      data: HexData;
    };
    target: SVGGElement;
  }

  function ready(fn: () => void): void;
}

declare const OI: {
  hexmap: typeof OI.Hexmap;
  ready: typeof OI.ready;
};
```

---

## Configuration Defaults

```typescript
// lib/terrain.ts

export const DEFAULT_CONFIG: MapConfig = {
  columns: 36,
  rows: 24,
  layout: 'odd-q',
  seed: '',                     // Empty = random seed
  
  terrainWeights: {
    open: 0.40,
    cover: 0.25,
    difficult: 0.20,
    impassable: 0.10,
    dangerous: 0.05,
  },
  
  elevationEnabled: true,
  elevationRange: { min: -2, max: 3 },
  elevationProbability: 0.25,   // 25% of hexes have non-zero elevation
  
  objectiveCount: 3,
  showCoordinates: true,
  showElevation: true,
  mapTitle: 'Battle Map',
};

export const PRINT_CONFIG: PrintConfig = {
  pageSize: 'letter',
  orientation: 'portrait',
  margins: 0.20,
};

export const TERRAIN_PATTERNS: Record<TerrainType, string> = {
  open: 'none',
  cover: 'url(#pattern-cover)',
  difficult: 'url(#pattern-difficult)',
  impassable: 'url(#pattern-impassable)',
  dangerous: 'url(#pattern-dangerous)',
};
```

---

## Feature Roadmap

### Phase 1: Core Generation ✱ MVP
- [ ] Project scaffolding (Vite + Preact + Tailwind + TypeScript)
- [ ] Copy `oi.hexmap.min.js` to `public/lib/`, load via script tag
- [ ] Create TypeScript declarations for oi.hexmap.js
- [ ] Implement seeded random number generator
- [ ] Procedural hex grid generation (36×24, odd-q layout)
- [ ] Terrain type assignment with weighted randomization
- [ ] SVG terrain patterns (all 5 types)
- [ ] Basic UI: map display + regenerate button
- [ ] Verify patterns render correctly in browser

### Phase 2: Controls & Configuration
- [ ] Terrain weight sliders (constrained to sum to 100%)
- [ ] Elevation toggle and numeric labels
- [ ] Coordinate label toggle (A1, B2, etc.)
- [ ] Seed input field for reproducible maps
- [ ] Map title input
- [ ] "Randomize" button generates new seed

### Phase 3: OPR Features
- [ ] Control point / objective markers (star or flag icon in hex)
- [ ] Deployment zone boundaries (using HexJSON `boundaries` feature)
- [ ] Terrain distribution presets:
  - Balanced (default weights)
  - Open Field (80% open, minimal cover)
  - Dense Urban (high cover/impassable)
  - Hazardous (elevated dangerous terrain)
  - Custom (user-defined)

### Phase 4: Export & Print
- [ ] Print stylesheet with proper margins and monochrome output
- [ ] Browser print dialog integration (Ctrl+P / Cmd+P)
- [ ] SVG download button (serializes current map)
- [ ] Shareable URL with seed as query parameter (`?seed=abc123`)
- [ ] Copy share link to clipboard

### Phase 5: Polish & Deploy
- [ ] Map legend (terrain type key)
- [ ] A4 paper size option (recalculates hex size)
- [ ] Mobile-responsive layout (stacked controls on small screens)
- [ ] Save/load configurations to localStorage
- [ ] GitHub Actions deployment workflow
- [ ] README with usage instructions and screenshots

### Future Ideas (Post-MVP)
- [ ] Road overlay (linear features between hexes)
- [ ] River/water overlay
- [ ] Scenario templates (specific OPR mission layouts)
- [ ] Multiple map sizes (18×12 for skirmish, 36×24 standard)
- [ ] Hex click-to-edit (manually override terrain)

---

## Component Overview

### App.tsx — Root Component

Manages global state and coordinates child components.

```tsx
import { useState, useCallback } from 'preact/hooks';
import { MapCanvas } from './components/MapCanvas';
import { ControlPanel } from './components/ControlPanel';
import { DEFAULT_CONFIG } from './lib/terrain';
import { generateSeed } from './lib/random';
import type { MapConfig } from './types';

export function App() {
  const [config, setConfig] = useState<MapConfig>({
    ...DEFAULT_CONFIG,
    seed: generateSeed(),
  });

  const handleRegenerate = useCallback(() => {
    setConfig(prev => ({ ...prev, seed: generateSeed() }));
  }, []);

  return (
    <div class="flex h-screen">
      <ControlPanel 
        config={config} 
        onChange={setConfig} 
        onRegenerate={handleRegenerate}
      />
      <main class="flex-1 p-4 flex items-center justify-center bg-gray-100">
        <div class="map-container bg-white shadow-lg">
          <MapCanvas config={config} />
        </div>
      </main>
    </div>
  );
}
```

### MapCanvas.tsx — Hexmap Integration

Wraps oi.hexmap.js, recreates the map when config changes.

```tsx
import { useRef, useEffect } from 'preact/hooks';
import { generateMap } from '../lib/generator';
import { ALL_PATTERNS, TERRAIN_FILL } from '../lib/patterns';
import { formatHexLabel } from '../lib/hexmath';
import type { MapConfig } from '../types';

interface Props {
  config: MapConfig;
}

export function MapCanvas({ config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Generate HexJSON from config
    const hexJson = generateMap(config);
    
    // Clear previous map instance
    containerRef.current.innerHTML = '';
    
    // Create new hexmap
    const hexmap = new OI.hexmap(containerRef.current, {
      hexjson: hexJson,
      patterns: ALL_PATTERNS,
      label: {
        show: config.showCoordinates || config.showElevation,
        clip: true,
        format: (txt, attr) => formatHexLabel(attr.hex, config),
      },
      ready() {
        // Apply terrain patterns as fill colors
        this.updateColours((region) => {
          const terrain = this.areas[region].data.terrain;
          return TERRAIN_FILL[terrain];
        });
      },
    });

    // Cleanup on unmount or config change
    return () => {
      containerRef.current?.replaceChildren();
    };
  }, [config]);

  return (
    <div 
      ref={containerRef} 
      class="w-full aspect-[3/4] map-preview"
      id="hex-map"
    />
  );
}
```

### Generator.ts — Procedural Generation

Pure function that produces HexJSON from configuration.

```typescript
import { createSeededRandom } from './random';
import type { MapConfig, HexJSON, HexData, TerrainType } from '../types';

export function generateMap(config: MapConfig): HexJSON {
  const random = createSeededRandom(config.seed);
  const hexes: Record<string, HexData> = {};
  
  // Build terrain probability ranges from weights
  const terrainRanges = buildTerrainRanges(config.terrainWeights);
  
  for (let q = 0; q < config.columns; q++) {
    for (let r = 0; r < config.rows; r++) {
      const id = `${q}-${r}`;
      const terrain = pickTerrain(random(), terrainRanges);
      const elevation = config.elevationEnabled && random() < config.elevationProbability
        ? randomElevation(random, config.elevationRange)
        : 0;
      
      hexes[id] = {
        q,
        r,
        n: formatCoordinate(q, r),  // "A1", "B2", etc.
        terrain,
        elevation,
        class: `terrain-${terrain}`,
      };
    }
  }
  
  return {
    layout: config.layout,
    hexes,
  };
}

function buildTerrainRanges(weights: Record<TerrainType, number>) {
  const ranges: Array<{ terrain: TerrainType; max: number }> = [];
  let cumulative = 0;
  
  for (const [terrain, weight] of Object.entries(weights)) {
    cumulative += weight;
    ranges.push({ terrain: terrain as TerrainType, max: cumulative });
  }
  
  return ranges;
}

function pickTerrain(
  roll: number, 
  ranges: Array<{ terrain: TerrainType; max: number }>
): TerrainType {
  for (const { terrain, max } of ranges) {
    if (roll < max) return terrain;
  }
  return 'open';  // Fallback
}

function formatCoordinate(q: number, r: number): string {
  const col = String.fromCharCode(65 + (q % 26));  // A-Z
  const row = r + 1;
  return `${col}${row}`;
}
```

### Random.ts — Seeded PRNG

Allows reproducible map generation from a seed string.

```typescript
// Simple mulberry32 PRNG - fast and good enough for terrain distribution
export function createSeededRandom(seed: string): () => number {
  let h = hashString(seed);
  
  return function() {
    h |= 0;
    h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
```

---

## Print Styles

```css
/* styles/print.css */

@media print {
  /* Hide all UI elements */
  aside,
  button,
  header,
  footer,
  .no-print,
  .control-panel {
    display: none !important;
  }

  /* Reset page to clean slate */
  html, body {
    margin: 0;
    padding: 0;
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Map container fills the page */
  .map-container {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-shadow: none;
    page-break-inside: avoid;
  }

  /* SVG fills container */
  #hex-map {
    width: 100%;
    height: auto;
  }

  /* Crisp vector rendering */
  svg {
    shape-rendering: geometricPrecision;
  }

  /* Hex outlines - consistent black stroke */
  .hex path {
    stroke: #000 !important;
    stroke-width: 0.4mm !important;
  }

  /* Ensure patterns print in pure black */
  pattern path {
    stroke: #000 !important;
  }
  
  pattern circle {
    fill: #000 !important;
  }

  /* Labels - small, legible, black */
  .hex-label {
    fill: #000 !important;
    font-family: Arial, sans-serif !important;
  }

  /* Remove any background colors from hexes */
  .terrain-open path {
    fill: white !important;
  }
}

/* Page configuration */
@page {
  size: letter portrait;
  margin: 0.2in;
}

/* A4 variant - can be toggled via class on body */
body.print-a4 @page {
  size: A4 portrait;
  margin: 0.2in;
}
```

### Screen Preview Styles (London 1895 Inspired)

```css
/* styles/map.css */

/* Preview container - parchment aesthetic */
.map-preview {
  font-family: "Times New Roman", Georgia, serif;
  background-color: #fdf4d6;
  padding: 1rem;
}

/* Hex styling */
.map-preview .hex path {
  stroke: #656058;
  stroke-width: 2px;
  transition: transform 0.15s ease, stroke-width 0.15s ease;
}

/* Terrain fills reference patterns */
.map-preview .terrain-open path {
  fill: #fdf4d6;
}

.map-preview .terrain-cover path {
  fill: url(#pattern-cover);
}

.map-preview .terrain-difficult path {
  fill: url(#pattern-difficult);
}

.map-preview .terrain-impassable path {
  fill: url(#pattern-impassable);
}

.map-preview .terrain-dangerous path {
  fill: url(#pattern-dangerous);
}

/* Labels */
.map-preview .hex-label {
  font-weight: 700;
  fill: #656058;
  font-size: 0.6em;
  text-shadow: 
    1px 1px 0 #fdf4d6,
    -1px 1px 0 #fdf4d6,
    -1px -1px 0 #fdf4d6,
    1px -1px 0 #fdf4d6;
}

/* Hover state for interactivity */
.map-preview .hex.hover path {
  stroke-width: 3px;
  stroke: #333;
}

.map-preview .hex.hover .hex-label {
  fill: #333;
}
```

---

## References

- [oi.hexmap.js Documentation](https://open-innovations.github.io/oi.hexmap.js/) — Library examples and API
- [oi.hexmap.js Repository](https://github.com/open-innovations/oi.hexmap.js) — Source code (cloned to `oi.hexmap.js/`)
- [HexJSON Format Specification](https://open-innovations.org/projects/hexmaps/hexjson) — Data format for hex layouts
- [One Page Rules](https://onepagerules.com/) — OPR terrain and game mechanics
- [Red Blob Games - Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/) — Comprehensive hex math reference
- [Preact Documentation](https://preactjs.com/) — Lightweight React alternative
- [Vite Documentation](https://vitejs.dev/) — Build tool and dev server
- [Tailwind CSS Documentation](https://tailwindcss.com/) — Utility-first CSS framework

---

## Glossary

| Term | Definition |
|------|------------|
| **Flat-topped hex** | Hexagon orientation where two edges are horizontal (top and bottom are flat) |
| **Pointy-topped hex** | Hexagon orientation where two vertices point up and down |
| **odd-q** | Coordinate system for flat-topped hexes where odd columns are offset |
| **q, r** | Axial coordinates for hex position (q = column, r = row) |
| **HexJSON** | JSON format for describing hex layouts, used by oi.hexmap.js |
| **Seed** | String used to initialize random number generator for reproducible results |
| **PRNG** | Pseudo-random number generator — produces deterministic "random" sequence from seed |
| **OPR** | One Page Rules — tabletop wargaming ruleset |
| **Control point** | Objective marker on the map that players compete to hold |
| **Deployment zone** | Area where players place units at game start |

---

## oi.hexmap.js Quick Reference

### Loading the Library

The library is loaded via script tag in `index.html` (not bundled):

```html
<script src="/lib/oi.hexmap.min.js"></script>
```

This exposes the global `OI` object with `OI.hexmap` constructor and `OI.ready` helper.

### Basic Usage

```javascript
// Wait for DOM ready
OI.ready(function() {
  // Create hexmap attached to a container element
  const map = new OI.hexmap(document.getElementById('map'), {
    hexjson: { layout: 'odd-q', hexes: { ... } },
    ready: function() {
      // Called after map is rendered
      this.updateColours(region => '#ff0000');
    }
  });
});
```

### Key Methods

| Method | Purpose |
|--------|---------|
| `updateColours(fn)` | Set fill color/pattern for each hex. `fn(regionId) → color string` |
| `updateLabels(labelKey, tooltipKey)` | Change which HexJSON property is used for labels |
| `updateBoundaries(fn)` | Style boundary lines. `fn(name, props) → style object` |
| `on(event, callback)` | Add event listener: `'mouseover'`, `'mouseout'`, `'click'` |
| `setClass(fn)` | Add CSS classes to hexes. `fn(regionId, area) → void` |

### HexJSON Structure

```javascript
{
  "layout": "odd-q",           // Coordinate system
  "hexes": {
    "unique-id": {
      "q": 0,                  // Column (required)
      "r": 0,                  // Row (required)
      "n": "Label",            // Display name
      "class": "terrain-open", // CSS class(es)
      // ... any custom properties
    }
  },
  "boundaries": {              // Optional edge lines
    "border-name": {
      "edges": [
        { "q": 0, "r": 0, "e": 1 }  // e = edge number 1-6
      ]
    }
  }
}
```

### Pattern Integration

Patterns are passed as an array of SVG strings:

```javascript
new OI.hexmap(el, {
  hexjson: data,
  patterns: [
    '<pattern id="my-pattern" ...>...</pattern>'
  ],
  ready() {
    this.updateColours(r => 'url(#my-pattern)');
  }
});
```

---

## License

Project code: MIT License
oi.hexmap.js: MIT License (ODI Leeds, 2021)

---

## Appendix: London 1895 Complete Example

For reference, here is the complete London 1895 example from oi.hexmap.js that inspired our visual design:

```html
<style>
  #ex4 figure { 
    font-family: "Times New Roman", serif; 
    background-color: #fdf4d6; 
    padding: 2rem; 
    position: relative; 
    color: #656058; 
  }
  #ex4 figcaption { margin-top: 2em; text-align: center; }
  
  #hexmap4 { 
    border-radius: 100%; 
    border: 4px solid #656058; 
    padding: 2em;
    aspect-ratio: 1 / 1; 
    position: relative; 
    margin: auto; 
  }
  
  #hexmap4 tspan.name { 
    font-family: "Arial Black", "Copperplate Gothic Bold", "Times New Roman", serif; 
  }
  
  #hexmap4 .hex path { 
    stroke: #656058; 
    stroke-width: 3px; 
    color: inherit; 
  }
  
  #hexmap4 .hex-label .id, 
  #hexmap4 .hex-label .name { 
    font-weight: 700; 
    fill: #656058; 
    text-shadow: 3px 3px 2px #fdf4d6, -3px 3px 1px #fdf4d6, 
                 -3px -3px 1px #fdf4d6, 3px -3px 2px #fdf4d6; 
  }
  
  #hexmap4 .hex .hex-label { stroke-width: 0; transform: scale(0.3); }
  #hexmap4 .hex.big .hex-label { transform: scale(0.6); }
  #hexmap4 .hex.hover .hex-label { transform: scale(0.4); }
  #hexmap4 .hex.big.hover .hex-label { transform: scale(0.9); }
  
  #hexmap4 .hex-label .id { font-size: 250%; font-family: "Times New Roman", serif; }
  #hexmap4 .hex-label .name { font-size: 1.3em; text-transform: uppercase; }
  
  #hexmap4 .hex.hover path { transform: scale(1.2); stroke-width: 4px; stroke: black; }
  #hexmap4 .hex.hover .id, 
  #hexmap4 .hex.hover .name { text-shadow: none; fill: #fdf4d6; }
  
  #hexmap4 .data-layer .hex path { fill: #fdf4d6 !important; }
  #hexmap4 .data-layer .hex.hover path { fill: #656058 !important; }
  #hexmap4 .data-layer .vertical path { fill: url(#verticalHatch) !important; }
  #hexmap4 .data-layer .horizontal path { fill: url(#horizontalHatch) !important; }
</style>

<script>
OI.ready(function(){
  hex = new OI.hexmap(document.getElementById('hexmap4'), {
    hexjson: {
      "layout": "odd-q",
      "hexes": {
        "A": {"n":"1a", "q":0, "r":3, "label":"Horn<br>sey", "class":"horizontal"},
        "B": {"n":"2a", "q":1, "r":2, "label":"Hack<br>ney", "class":"horizontal"},
        // ... more hexes
        "S": {"n":"", "q":0, "r":1, "label":"The<br><tspan class='capital'>City</tspan>", "class":"big"}
      }
    },
    patterns: [
      '<pattern id="verticalHatch" patternUnits="userSpaceOnUse" width="8" height="8">' +
        '<path d="M0,0 l0,8 M4,0 l0,8" style="stroke:#656058;stroke-width:8;opacity:0.3;" />' +
      '</pattern>',
      '<pattern id="horizontalHatch" patternUnits="userSpaceOnUse" width="8" height="8">' +
        '<path d="M0,0 l8,0 M0,4 l8,0" style="stroke:#656058;stroke-width:8;opacity:0.3;" />' +
      '</pattern>'
    ],
    label: {
      show: true,
      format: function(txt, attr) {
        let tspans = '';
        let lines = (txt) ? [txt] : [];
        lines = lines.concat(attr.hex.label.split(/<br ?\/?>/));
        for (let i = 0; i < lines.length; i++) {
          const yOffset = (i - lines.length/2 + 0.5) * (attr['font-size'] * 1.5);
          tspans += '<tspan class="' + (txt && i==0 ? 'id' : 'name') + '" ' +
                    'y="' + yOffset.toFixed(3) + '" x="0">' + lines[i] + '</tspan>';
        }
        return tspans;
      }
    },
    ready: function() {
      // Map is rendered, can add additional logic here
    }
  });
});
</script>
```

This example demonstrates:
- Custom CSS classes per hex (`horizontal`, `vertical`, `big`)
- SVG patterns for fill differentiation
- Multi-line label formatting with `<tspan>` elements
- Hover state styling with color inversion
- Text shadows for legibility over patterned backgrounds
