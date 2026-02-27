# OPR Hex Battle Map Generator

## Project Overview

A web-based tool for generating, visualizing, and printing One Page Rules (OPR)–compatible hex battle maps. Maps are procedurally generated following OPR terrain placement guidelines, monochrome, print-friendly, and designed to fit on a single US Letter (or A4) page for use with physical unit tokens.

This project brings the classic hex-and-counter wargame aesthetic to OPR, replacing tape measures with hex counting while maintaining full compatibility with OPR rules.

## Primary Audience

OPR tabletop wargamers who want to:
- Rapidly generate balanced, valid battle maps without manual drawing
- Play OPR using hex-based movement instead of tape measures
- Print single-page maps for portable or quick-setup games

## Core Value Proposition

- Procedurally generated hex maps following OPR terrain placement guidelines
- 1:1 mapping of OPR terrain rules to hex representations
- Print-ready output on a single page (US Letter or A4)
- Monochrome styling optimized for printing (classic hex-and-counter aesthetic)
- Shareable maps via seed-based regeneration
- Designed for 7mm diameter unit tokens

---

## Scale & Distance System

### The Core Concept: 1 Hex = 1 Inch

This map system represents a **half-scale OPR table** (36" × 24"). Each hex equals 1 inch on that half-scale table.

| Full-Scale OPR | Half-Scale OPR | Hex Equivalent |
|----------------|----------------|----------------|
| 72" × 48" table | 36" × 24" table | 36 × 24 hex grid |
| 12" move | 6" move | 6 hexes |
| 24" range | 12" range | 12 hexes |
| 12" deployment | 6" deployment | 6 hexes from edge |

**How to play:**
1. Use half-distance rules as normal for OPR half-scale play
2. Count hexes instead of measuring with a ruler
3. A unit with Move 12" on their card → apply half-distance (6") → move up to 6 hexes

This eliminates measuring disputes and speeds up play while maintaining full OPR rules compatibility.

### Hex Movement Rules

**Adjacent hexes:** A hex has 6 neighbors. Moving to any adjacent hex costs 1 hex of movement.

**Diagonal movement:** In a hex grid, there is no "diagonal" — all adjacent hexes are equidistant. This is one of the advantages of hex grids over square grids.

**Movement example:** A unit with Move 12" (6" half-scale) can move up to 6 hexes in any path through adjacent hexes.

**Difficult terrain:** If any part of a unit's movement passes through difficult terrain, the entire unit's movement is limited to 6" (3 hexes at half-scale) for that activation. This applies even if the unit starts in difficult terrain.

### Unit Coherency in Hexes

OPR requires models to stay within 1" of at least one other model and within 9" of all models.

For hex play:
- **1" coherency** = models must be in the same hex or adjacent hexes
- **9" coherency** = models must be within 9 hexes of each other

Single-model units ignore coherency. Multi-model units should keep models in a connected cluster of hexes.

### Grid Specifications

| Specification | Value | Rationale |
|---------------|-------|-----------|
| Grid size | 36 × 24 hexes | Half-scale OPR table (36" × 24") |
| Hex orientation | Flat-topped (odd-q layout) | Best fit for portrait page |
| Page orientation | Portrait | Maximizes hex size for 36×24 grid |
| Token diameter | 7mm | Physical tokens fit within hex interior |
| Margins | 0.20" (5.08mm) | Minimal safe margin for most printers |

### Hex Coordinate System (odd-q)

The grid uses **odd-q offset coordinates**, a standard hex coordinate system for flat-topped hexes:

```
  Column:  0     1     2     3     4     5
        _____       _____       _____
       /     \_____/     \_____/     \        Row 0
       \_____/     \_____/     \_____/
       /     \_____/     \_____/     \        Row 1
       \_____/     \_____/     \_____/
       /     \_____/     \_____/     \        Row 2
       \_____/     \_____/     \_____/
       
  Odd columns (1, 3, 5...) are shifted DOWN by half a hex height.
```

- **q** = column (0–35, left to right)
- **r** = row (0–23, top to bottom)
- **Odd columns** (1, 3, 5...) are offset downward by half a hex height
- **Display labels** use letter+number format: Column A=0, B=1, etc. Row 1=0, 2=1, etc.

Example: Hex at q=2, r=5 displays as "C6"

### Hex Geometry

**Flat-topped hex relationships:**
- Hex width (flat-to-flat) = `w`
- Hex height (point-to-point) = `w × 1.1547`
- Horizontal spacing = `w × 0.75` (hexes interlock)
- Vertical spacing = hex height

**Calculated hex sizes:**

| Paper Size | Hex Width | Hex Height | 7mm Token Fit |
|------------|-----------|------------|---------------|
| US Letter | 7.55mm | 8.72mm | ✓ 0.05mm clearance |
| A4 | 7.33mm | 8.47mm | ✓ Snug but works |

---

## OPR Terrain System

OPR terrain is **combinatorial** — a single terrain feature can have multiple properties. For example, a Forest is both Difficult terrain AND Cover terrain AND has special line-of-sight rules.

### Terrain Properties (Per OPR Rules)

| Property | OPR Game Effect | Hex Representation |
|----------|-----------------|-------------------|
| **Open** | No special rules | Empty/white fill |
| **Cover** | +1 Defense when majority of unit is inside/behind | Indicated in legend |
| **Difficult** | Models may not move more than 6" (3" half-scale = 3 hexes) | Indicated in legend |
| **Dangerous** | Roll dice equal to Tough value when entering/activated in; 1 = one wound | Indicated in legend |
| **Impassable** | Cannot move through | Indicated in legend |
| **Blocking** | Cannot draw line of sight through | Solid fill pattern |
| **Elevated** | Special LOS rules; may require climbing | Elevation number in hex |

### Line of Sight (LOS) System

OPR has nuanced LOS rules. For hex map play, we simplify to three categories:

| LOS Type | Symbol | Meaning | Examples |
|----------|--------|---------|----------|
| **Clear** | ○ | Can see through freely | Open, Rubble, Crater |
| **Partial** | ◧ | Can see into/out of, but not through | Forest, Field, Hill |
| **Blocking** | ⬛ | Cannot see through at all | Buildings, Rocks, Mountains |

**How to use:** Draw a straight line from the center of the attacking unit's hex to the center of the target's hex. Check what terrain hexes the line crosses:

1. **Crosses Blocking terrain** → No LOS (attack not possible)
2. **Crosses Partial terrain** → LOS exists only if attacker OR target is inside that partial terrain
3. **Crosses only Clear terrain** → Full LOS

**Cover from LOS:** Remember that other units (friendly or enemy) also block LOS and can provide cover. If the line crosses a hex containing another unit, that unit blocks sight.

### Cover Mechanics in Hex Play

OPR grants +1 Defense when "majority of models are fully inside cover terrain or behind a sight blocker."

**For hex play:**
- **Single-model unit:** If the model's hex is Cover terrain, it gets +1 Defense
- **Multi-model unit:** If more than half the models are in Cover terrain hexes, the unit gets +1 Defense
- **Behind sight blocker:** If the LOS line from attacker to target crosses a Blocking hex or another unit, the target gets +1 Defense

### Elevation System

Each elevation level represents **2 inches** of height.

| Level | Height | Examples |
|-------|--------|----------|
| +3 | 6" | Tall tower, cliff top |
| +2 | 4" | Rooftop, high ground |
| +1 | 2" | Low hill, raised platform |
| 0 | Ground | Default terrain level |
| -1 | -2" | Shallow trench, depression |
| -2 | -4" | Deep canyon, crater |

**Climbing rules (per OPR):**
- **±1 level difference:** Climbable. Costs +1 hex of movement (unit may not end mid-climb).
- **±2 or more level difference:** Impassable. Cannot climb directly; must find a path through intermediate elevations.

This maps to OPR's rule: terrain up to 3" can be climbed, over 3" is impassable.

**Elevation and LOS:**
- Units on elevated terrain may ignore one unit/terrain for line of sight (per OPR Hill rules)
- Higher elevation provides advantage when shooting down

**Terrain on Elevation:**
A hex can have both a terrain type AND an elevation. For example, a Forest hex at elevation +1 represents trees on a hill. The hex has all properties of both:
- Forest properties: Difficult, Cover, Partial LOS
- Elevation +1: Climbing rules apply, LOS advantage

The generator may place terrain clusters on varied elevations to create more interesting maps.

---

## Terrain Presets

Rather than exposing raw terrain properties, the generator uses **presets** — named terrain types that bundle the correct OPR properties together.

### MVP Terrain Presets (OPR-Aligned)

These presets are aligned with OPR rulebook guidelines (lines 199-211):

| Preset | OPR Properties | LOS | Pattern Description |
|--------|---------------|-----|---------------------|
| **Open** | None | Clear ○ | Empty white fill |
| **Barricade** | Cover | Clear ○ | Horizontal dash (barrier) |
| **Building** | Impassable + Blocking | Blocking ⬛ | Solid dark fill |
| **Field** | Difficult + Cover | Partial ◧ | Diagonal lines (crops) |
| **Forest** | Difficult + Cover | Partial ◧ | Filled circles (tree canopy) |
| **Hill** | Cover + Difficult (upward) | Partial ◧ | Single curved arc |
| **Shallow Water** | Difficult | Clear ○ | Wavy horizontal lines |
| **Deep Water** | Impassable | Clear ○ | Wavy lines + gray background |
| **Lava** | Dangerous | Clear ○ | Bold X marks (hazard) |
| **Mountain** | Impassable + Blocking | Blocking ⬛ | Solid with triangle texture |
| **River** | Dangerous (rush/charge) | Clear ○ | Wavy lines |
| **Rubble** | Difficult | Clear ○ | Rotated rectangles (debris) |
| **Ruins** | Cover + Dangerous (rush/charge) | Clear ○ | X crosshatch |
| **Swamp** | Difficult | Clear ○ | Straight lines + dots |

### Additional Terrain Presets

| Preset | OPR Properties | LOS | Pattern Description |
|--------|---------------|-----|---------------------|
| **Crater** | Cover | Clear ○ | Dashed concentric circles |
| **Steep Hill** | Cover + Difficult (upward) | Partial ◧ | Double nested arcs |

Note: "Difficult (upward)" means the terrain is only difficult when moving up onto it, not when moving across or down. This is implemented as `difficult: 'upward'` in the type system.

### Multi-Hex Terrain Clusters

In OPR, terrain pieces have physical size. For hex maps, terrain is represented as **clusters of adjacent hexes** sharing the same terrain type.

**Terrain cluster size guidelines (per OPR):**

| OPR Size | Physical Size | Hex Cluster Size |
|----------|---------------|------------------|
| Small/Scatter | 1"–3" | 1–3 hexes |
| Medium | 4"–6" | 4–6 hexes |
| Large | 6"–8" | 6–8 hexes |
| Very Large | 8"–12" | 8–12 hexes |

The generator creates terrain as clusters, not individual hexes. A "Forest" might be a 5-hex cluster, while "Barricades" might be 2-hex lines.

**Cluster shapes:**
- **Organic terrain** (Forest, Swamp, Field): Irregular blob shapes
- **Man-made terrain** (Building, Barricade, Ruins): Rectangular or linear shapes
- **Natural features** (Hill, Crater, Rocks): Roughly circular or oval

### Terrain Preset Data Structure

```typescript
interface TerrainPreset {
  id: string;
  name: string;
  properties: {
    cover: boolean;
    difficult: boolean | 'upward'; // true = always, 'upward' = only when moving up (hills)
    dangerous: boolean | 'rush-charge'; // true = always, 'rush-charge' = conditional
    impassable: boolean;
    blocking: boolean;
  };
  losType: 'clear' | 'partial' | 'blocking';
  baseElevation?: number; // If terrain inherently has elevation (hills)
  patternId: string; // SVG pattern ID
  description: string; // For legend
  clusterSize: { min: number; max: number }; // Hex cluster size range
  shape: 'organic' | 'rectangular' | 'circular' | 'linear'; // Cluster growth shape
}
```

### Future: Custom Presets

In future versions, users will be able to:
- Rename presets (e.g., "Forest" → "Alien Jungle")
- Create custom presets with specific property combinations
- Support Advanced Terrain rules (Army Terrain, Relic Terrain, etc.)

---

## Procedural Generation

The generator follows OPR terrain placement guidelines (rulebook lines 221-258) to create balanced, playable maps.

### OPR Placement Guidelines

| Guideline | Rule | Implementation |
|-----------|------|----------------|
| Terrain count | 15-20+ pieces | Configurable density slider |
| Table coverage | ~25% of table | Algorithm targets coverage percentage |
| LOS blocking | At least 50% of terrain | Weighted generation ensures mix |
| Cover terrain | At least 33% of terrain | Weighted generation ensures mix |
| Difficult terrain | At least 33% of terrain | Weighted generation ensures mix |
| No edge-to-edge LOS | Can't see straight across | Algorithm validates and adjusts |
| Max gap between terrain | 12" (6 hexes at half-scale) | Algorithm ensures no large empty zones |
| Min gap for unit passage | 6" (3 hexes at half-scale) | Algorithm ensures pathways exist |

### Generation Algorithm

1. **Seed initialization** — Use provided seed or generate random seed for reproducibility
2. **Terrain budget** — Calculate number of terrain clusters based on density setting (15–25 clusters)
3. **Terrain mix** — Select terrain types following OPR percentage guidelines (adjustable via sliders)
4. **Cluster generation** — For each terrain piece:
   - Select terrain preset based on weighted mix
   - Determine cluster size (small/medium/large based on terrain type)
   - Generate cluster shape (organic vs geometric based on terrain type)
5. **Placement** — Distribute clusters across grid ensuring:
   - No gaps larger than 6 hexes without terrain
   - No clear LOS line across entire map (edge to edge)
   - Minimum 2-hex pathways between terrain for unit movement
   - Clusters don't overlap (except elevation can overlay other terrain)
6. **Elevation assignment** — Add elevation values to hills and optionally vary other terrain
7. **Validation** — Check OPR placement rules and adjust if needed

### OPR Placement Validation (Implemented)

Per OPR rulebook guidelines (lines 252-257), the generator validates and fixes terrain placement:

**Rule 1: No Edge-to-Edge Clear LOS**
- Scans each row and column for blocking/partial LOS terrain
- If a row or column has clear sightlines across the entire map, adds a forest cluster to break it
- Implementation: `fixEdgeToEdgeLOS()` in `src/lib/generator.ts`

**Rule 2: No Gaps Larger Than 6 Hexes (12" at half-scale)**
- Uses BFS to find connected open areas
- If any open area exceeds 6 hexes in extent, adds cover terrain (forest, ruins, rubble, or barricade) to fill the gap
- Implementation: `fixLargeGaps()` in `src/lib/generator.ts`

**Rule 3: Minimum Pathways for Unit Movement**
- The cluster placement algorithm naturally leaves gaps between terrain
- Blocking terrain is limited to ~50% of clusters, ensuring pathways exist
- No active enforcement needed; validated by design

### Elevation with Climbable Paths (Implemented)

Per OPR climbing rules (±1 level = climbable, ±2+ = impassable):

**Ramp Generation for +2 Terrain**
- When placing steep hills (elevation +2), the generator creates adjacent +1 hexes as "ramps"
- This ensures units can climb to elevated positions via intermediate steps
- Implementation: `createElevationRamp()` and `ensureClimbablePath()` in `src/lib/generator.ts`

**Elevation Assignment**
- Hills get base elevation +1, steep hills get +2
- Craters get elevation -1 (depression)
- Small chance (1%) of scattered +1/-1 elevation on open terrain for variety

### Terrain Cluster Sizing

Different terrain types have typical sizes:

| Terrain Type | Typical Cluster Size | Shape |
|--------------|---------------------|-------|
| Forest | 4–8 hexes | Organic blob |
| Building | 2–6 hexes | Rectangular |
| Hill | 4–8 hexes | Oval/circular |
| Ruins | 3–6 hexes | Irregular |
| Barricade | 2–3 hexes | Linear |
| Water | 4–10 hexes | Organic/linear |
| Rubble | 2–4 hexes | Scattered |
| Rocks | 1–3 hexes | Compact |
| Crater | 2–4 hexes | Circular |
| Dangerous | 2–4 hexes | Any |

### User Controls

| Control | Type | Purpose |
|---------|------|---------|
| Seed | Text input | Reproducible generation |
| Terrain Density | Slider | 15-25 terrain pieces equivalent |
| LOS Blocking % | Slider | Adjust blocking terrain ratio |
| Cover % | Slider | Adjust cover terrain ratio |
| Difficult % | Slider | Adjust difficult terrain ratio |
| Elevation Enabled | Toggle | Add elevation numbers to terrain |
| Preset | Dropdown | Balanced / Open Field / Dense / Custom |

### Generation Presets

| Preset | Description | Terrain Mix |
|--------|-------------|-------------|
| **Balanced** | Standard OPR recommendations | 50% blocking, 33% cover, 33% difficult |
| **Open Field** | Sparse terrain, long sight lines | 30% blocking, 20% cover, 20% difficult |
| **Dense Urban** | Heavy cover, limited movement | 60% blocking, 50% cover, 40% difficult |
| **Hazardous** | Dangerous terrain emphasis | 40% blocking, 30% cover, 30% dangerous |

Note: Percentages can exceed 100% total because terrain types overlap. A Forest counts toward both Cover AND Difficult percentages. The generator selects terrain presets to meet all minimum thresholds.

---

## Visual Design

### Design Philosophy

Inspired by classic hex-and-counter wargames and the London 1895 hexmap from oi.hexmap.js. The aesthetic prioritizes:

- **Clarity** — Each terrain type instantly recognizable at small hex sizes
- **Print-friendliness** — Monochrome patterns that reproduce well on any printer
- **Elegance** — Clean, professional appearance worthy of framing

### Screen vs Print Styling

| Element | Screen Preview | Print Output |
|---------|---------------|--------------|
| Background | Pure white | Pure white |
| Hex stroke | Light gray (#999) | Black (#000) |
| Patterns | Grayscale (#222) | Pure black |
| Typography | System sans-serif | Arial, sans-serif |

Note: The design uses grayscale throughout for optimal printing. No parchment/sepia tones.

### SVG Pattern Specifications

Each terrain preset has a unique, visually distinct pattern optimized for ~7.5mm hex size. Patterns use `patternUnits="userSpaceOnUse"` with 45-70 unit tiles for visibility at small sizes.

#### Pattern Visual Language

| Pattern | Shape | Meaning | Distinct Feature |
|---------|-------|---------|------------------|
| Forest | Filled circles | Tree canopy from above | Only terrain with large circles |
| Rubble | Rotated rectangles | Angular debris | Only terrain with squares |
| Ruins | X crosshatch | Crumbling walls | Bold diagonal cross |
| Building | Solid dark fill | Impassable structure | Darkest solid (#1a1a1a) |
| Mountain | Solid with triangle | Impassable rock | Dark solid with subtle texture |
| Hill | Single curved arc | Elevation contour | One arc, open at bottom |
| Steep Hill | Double nested arcs | Higher elevation | Multiple arcs vs single |
| Field | Diagonal lines | Crop rows | Diagonal vs horizontal |
| Barricade | Horizontal dash | Barrier segment | Thick horizontal line |
| Shallow Water | Wavy lines | Water movement | Wavy horizontal |
| Deep Water | Wavy + gray bg | Deeper water | Gray background |
| Swamp | Straight line + dots | Murky water + vegetation | Straight (not wavy) + dots |
| Crater | Dashed circles | Impact depression | Only dashed circular lines |
| Lava/Dangerous | Bold X marks | Universal hazard | Clear danger indication |

#### Pattern Implementation

Patterns are defined in `src/lib/patterns.ts` and applied via CSS in `src/styles/map.css` using `!important` overrides (following the oi.hexmap.js London 1895 example approach).

```css
/* Example pattern application */
.terrain-forest path {
  fill: url(#pattern-forest) !important;
}
```

Key implementation details:
- Base color: `#ffffff` (white background)
- Stroke color: `#222222` (dark gray for printing)
- Pattern tile sizes: 45-70 units for visibility at 7.5mm hex size
- Opacity: 0.35-0.6 for subtle but visible patterns

### Hex Labels

Each hex can display:
- **Coordinate** (optional) — Column letter + row number (A1, B2, etc.)
- **Elevation** (optional) — Numeric level (+1, +2, -1, etc.)

Labels are small, centered in hex, with text shadow for legibility over patterns.

### Map Legend

The legend explains terrain properties and is essential for play. Options:
- **On-map** (optional) — Small legend in corner of map
- **Separate page** (optional) — Full legend on second printed page
- **Neither** — Players reference digital legend

Legend includes:
- Terrain preset name and pattern swatch
- Properties (Cover, Difficult, Dangerous, Impassable)
- LOS type symbol (○ ◧ ⬛)
- Special rules notes (e.g., "Dangerous on Rush/Charge only")

### Map Metadata

Always displayed (small, corner placement):
- **Seed** — For regeneration and sharing

Optional:
- **Title** — User-defined map name
- **Scale reminder** — "1 hex = 1 inch (half-scale)"

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 5.x | Type-safe development |
| Vite | 5.x | Fast dev server, optimized builds |
| Preact | 10.x | Lightweight reactive UI (~3KB) |
| Tailwind CSS | 3.x | Utility-first styling |
| oi.hexmap.js | 0.8.4 | SVG hex rendering engine |

### Why This Stack?

- **TypeScript** — Terrain presets, hex data, and generation configs benefit from strong typing
- **Preact** — Reactive UI for sliders and toggles without React's bundle size
- **Tailwind** — Rapid UI development; print styles use custom CSS
- **oi.hexmap.js** — Purpose-built for hex rendering with pattern support and boundary drawing

---

## Architecture

```
opr-hex-generator/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
│
├── src/
│   ├── main.tsx                 # Entry point
│   ├── app.tsx                  # Root component, global state
│   │
│   ├── components/
│   │   ├── MapCanvas.tsx        # Hexmap container, oi.hexmap.js integration
│   │   ├── ControlPanel.tsx     # Settings sidebar
│   │   ├── TerrainMixSliders.tsx # Terrain percentage controls
│   │   ├── DensitySlider.tsx    # Overall terrain density
│   │   ├── ToggleGroup.tsx      # Elevation, coordinates toggles
│   │   ├── SeedInput.tsx        # Seed for reproducibility
│   │   ├── PresetSelector.tsx   # Balanced/Open/Dense/Custom
│   │   └── ExportButtons.tsx    # Print, SVG download, share
│   │
│   ├── lib/
│   │   ├── generator.ts         # Procedural generation algorithm
│   │   ├── terrainPresets.ts    # Terrain preset definitions
│   │   ├── patterns.ts          # SVG pattern strings
│   │   ├── validation.ts        # OPR placement rule validation
│   │   ├── hexmath.ts           # Hex coordinate utilities
│   │   ├── random.ts            # Seeded PRNG
│   │   └── export.ts            # SVG serialization, print
│   │
│   ├── types/
│   │   ├── index.ts             # Shared types
│   │   └── oi-hexmap.d.ts       # oi.hexmap.js type declarations
│   │
│   └── styles/
│       ├── index.css            # Tailwind + base styles
│       ├── map.css              # Hex styling, patterns
│       └── print.css            # Print overrides
│
├── public/
│   └── lib/
│       └── oi.hexmap.min.js     # Hex rendering library
│
└── .github/
    └── workflows/
        └── deploy.yml           # GitHub Pages deployment
```

---

## Type Definitions

### Core Types

```typescript
// Terrain property flags
interface TerrainProperties {
  cover: boolean;
  difficult: boolean | 'upward'; // true = always, 'upward' = only when moving up
  dangerous: boolean | 'rush-charge';
  impassable: boolean;
  blocking: boolean;
}

// LOS categories
type LOSType = 'clear' | 'partial' | 'blocking';

// Terrain preset definition
interface TerrainPreset {
  id: string;
  name: string;
  properties: TerrainProperties;
  losType: LOSType;
  baseElevation?: number;
  patternId: string;
  description: string;
  clusterSize: { min: number; max: number };
  shape: 'organic' | 'rectangular' | 'circular' | 'linear';
}

// Individual hex data
interface HexData {
  q: number;                    // Column
  r: number;                    // Row
  n: string;                    // Display name (tooltip: "Terrain | Elev +X | Coord")
  terrain: string;              // Preset ID
  elevation: number;            // Height level
  class?: string;               // CSS class for pattern application
}

// Generation configuration
interface GeneratorConfig {
  columns: number;
  rows: number;
  seed: string;
  density: number;              // 0-1, maps to terrain piece count
  terrainMix: {
    blocking: number;           // 0-1 percentage
    cover: number;
    difficult: number;
    dangerous: number;
  };
  elevationEnabled: boolean;
  elevationRange: { min: number; max: number };
}

// Display options
interface DisplayConfig {
  showCoordinates: boolean;
  showElevation: boolean;
  showTitle: boolean;
  title: string;
}

// HexJSON format (oi.hexmap.js)
interface HexJSON {
  layout: 'odd-q' | 'even-q' | 'odd-r' | 'even-r';
  hexes: Record<string, HexData>;
}
```

---

## Configuration Defaults

```typescript
const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  columns: 36,
  rows: 24,
  seed: '',                     // Empty = random
  density: 0.5,                 // ~17-18 terrain pieces
  terrainMix: {
    blocking: 0.50,             // OPR: at least 50%
    cover: 0.33,                // OPR: at least 33%
    difficult: 0.33,            // OPR: at least 33%
    dangerous: 0.10,            // Light dangerous presence
  },
  elevationEnabled: true,
  elevationRange: { min: -2, max: 3 },
};

const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showCoordinates: false,       // Clean look by default
  showElevation: true,          // Important for gameplay
  showTitle: false,
  title: 'Battle Map',
  legendPosition: 'none',       // Players use digital reference
};
```

---

## Print Styles

```css
@media print {
  /* Hide UI */
  aside, button, header, .control-panel, .no-print {
    display: none !important;
  }

  /* Clean slate */
  html, body {
    margin: 0;
    padding: 0;
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Map fills page */
  .map-container {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }

  /* Crisp vectors */
  svg {
    shape-rendering: geometricPrecision;
  }

  /* Black strokes */
  .hex path {
    stroke: #000 !important;
    stroke-width: 0.4mm !important;
  }

  /* Black patterns */
  pattern path, pattern circle, pattern rect {
    stroke: #000 !important;
    fill: #000 !important;
  }

  /* Black labels */
  .hex-label {
    fill: #000 !important;
    font-family: Arial, sans-serif !important;
  }

  /* White base for open terrain */
  .terrain-open path {
    fill: white !important;
  }
}

@page {
  size: letter portrait;
  margin: 0.2in;
}
```

---

## Feature Roadmap

### Phase 1: Core Generation (MVP) ✅ COMPLETE
- [x] Project scaffolding (Vite + Preact + Tailwind + TypeScript)
- [x] oi.hexmap.js integration with TypeScript declarations
- [x] Terrain preset definitions with correct OPR properties
- [x] SVG patterns for all terrain types
- [x] Seeded random number generator
- [x] Basic procedural generation (terrain placement)
- [x] OPR placement rule validation (gaps, LOS blocking)
- [x] Basic UI: map display + regenerate button
- [x] Elevation system (2" per level, ±1 climbable)
- [x] Hover tooltips showing "Terrain Name | Elev +X | Coordinate"

### Phase 2: Controls & Configuration
- [ ] Terrain density slider
- [ ] Terrain mix sliders (blocking/cover/difficult/dangerous %)
- [ ] Generation preset selector (Balanced/Open/Dense/Hazardous)
- [ ] Elevation toggle
- [ ] Coordinate label toggle
- [ ] Seed input for reproducibility
- [ ] "Randomize" button

### Phase 3: Export & Print
- [ ] Print stylesheet with proper margins
- [ ] Browser print dialog integration
- [ ] SVG download button
- [ ] Shareable URL with seed parameter
- [ ] Copy share link to clipboard

### Phase 4: Legend & Polish
- [ ] Map legend component (terrain key with LOS symbols)
- [ ] Legend positioning options (corner/separate/none)
- [ ] Optional map title
- [ ] A4 paper size option
- [ ] Mobile-responsive layout
- [ ] GitHub Pages deployment

### Future Phases (Post-MVP)
- [ ] Custom terrain preset naming
- [ ] Boundary overlays (rivers, roads)
- [ ] Advanced Terrain rules (Army Terrain, Relic Terrain)
- [ ] Terrain placement styles from OPR (Random, Alternating, Six Squares, etc.)
- [ ] Planet-themed terrain generators (Hospitable, Wasteland, Death)
- [ ] Hex click-to-edit for manual terrain adjustment
- [ ] Multiple map sizes (18×12 skirmish, 36×24 standard, 48×32 large)
- [ ] Scenario templates
- [ ] Import/export map configurations as JSON

---

## Deployment Zones

OPR deployment is 12" from table edge (6" at half-scale = 6 hexes).

**For hex play:** Players deploy within the first 6 rows of hexes on their respective table edges.

- **Player 1 deployment:** Rows 0–5 (hexes with r = 0 to 5)
- **Player 2 deployment:** Rows 18–23 (hexes with r = 18 to 23)

The generator does NOT mark deployment zones — players simply count 6 hexes from their edge. This keeps the map neutral and reusable for different scenarios.

---

## Playing OPR with Hex Maps

### Quick Start for Players

1. **Print the map** or display on a tablet/screen
2. **Use half-distance rules** — all distances in OPR are halved
3. **1 hex = 1 inch** — count hexes instead of measuring
4. **Reference the legend** for terrain properties

### Movement Tips

- **Counting hexes:** Count the destination hex, not the starting hex. Moving from hex A to adjacent hex B = 1 hex of movement.
- **Difficult terrain:** If ANY hex in your path is Difficult, your entire move is limited to 3 hexes max.
- **Climbing:** Moving up or down 1 elevation level costs +1 hex of movement. Moving 2+ levels at once is blocked — find a path with intermediate levels.
- **Impassable:** You cannot enter Impassable hexes at all. Plan your path around them.

### Combat Tips

- **LOS check:** Use a straightedge or string from hex center to hex center.
- **Partial terrain:** If the line grazes the edge of a Partial terrain hex, use common sense — if it's clearly passing through, it blocks; if it's barely touching, it doesn't.
- **Cover:** When in doubt about "majority in cover," count models in Cover hexes vs total models.
- **Elevation advantage:** Units on higher elevation can ignore one piece of intervening terrain or one unit for LOS purposes.

### Common Conversions

| OPR Rule | Hex Equivalent |
|----------|----------------|
| "Within 1" of" | Same hex or adjacent hex |
| "Within 3" of" | Within 3 hexes |
| "More than 9" away" | More than 9 hexes away |
| "Base contact" | Same hex |
| "Wholly within" | All models in specified hex area |
| "Charge into contact" | Move into target's hex |

### Charging in Hex Play

When charging, a unit must end with at least one model in the same hex as an enemy model (representing base contact). The charging unit's remaining models should be in adjacent hexes, maintaining coherency.

If multiple models from the charging unit can reach the target hex, only one needs to actually enter it — the others form a "pile in" around adjacent hexes.

---

## Local Reference Materials

### oi.hexmap.js (Cloned)

**Location:** `oi.hexmap.js/`

```
oi.hexmap.js/
├── dist/
│   ├── oi.hexmap.js          # Full source — read for API understanding
│   └── oi.hexmap.min.js      # Minified — copy to public/lib/
├── index.html                # Examples — open in browser for demos
├── resources/
│   └── *.hexjson             # Example HexJSON files
└── README.md
```

### OPR Rules Reference

**Location:** `opr-rulebook-content.txt`

Contains extracted terrain rules from OPR rulebook:
- Terrain types and properties (lines 1-100)
- Terrain setup guidelines (lines 100-180)
- Terrain placement recommendations (lines 180-260)
- Advanced terrain rules (lines 260+) — future reference

---

## Quick Reference

### OPR Terrain Properties Summary

| Property | Effect | Hex Rule |
|----------|--------|----------|
| Cover | +1 Defense when majority inside/behind | Model in Cover hex or LOS crosses blocking hex |
| Difficult | Max 6" move (3 hexes at half-scale) | Any hex in path is Difficult = max 3 hex move |
| Dangerous | Roll Tough dice on enter/activate; 1 = wound | Entering or starting activation in hex |
| Impassable | Cannot enter | Cannot move into hex |
| Blocking | Cannot see through | LOS line cannot cross hex |
| Elevated | LOS advantage; climbing rules apply | Check elevation difference between hexes |

### Elevation Quick Rules

| Level Difference | Result |
|------------------|--------|
| ±1 | Climbable (costs movement) |
| ±2 or more | Impassable |

### LOS Quick Reference

| Symbol | Meaning |
|--------|---------|
| ○ | Clear — see through |
| ◧ | Partial — see into/out, not through |
| ⬛ | Blocking — cannot see through |

### Scale Quick Reference

| OPR Distance (Half-Scale) | Hexes | Common Use |
|---------------------------|-------|------------|
| 1" | 1 hex | Base contact, coherency |
| 3" | 3 hexes | Advance move (infantry) |
| 6" | 6 hexes | Rush/Charge, deployment depth |
| 9" | 9 hexes | Max coherency, objective spacing |
| 12" | 12 hexes | Standard shooting range |
| 18" | 18 hexes | Long range weapons |
| 24" | 24 hexes | Sniper/artillery range |

---

## Glossary

| Term | Definition |
|------|------------|
| **Flat-topped hex** | Hex orientation with horizontal top/bottom edges |
| **odd-q** | Offset coordinate system where odd columns shift down by half a hex |
| **HexJSON** | JSON format for hex layouts used by oi.hexmap.js |
| **Seed** | String for reproducible random generation |
| **PRNG** | Pseudo-random number generator |
| **OPR** | One Page Rules tabletop wargaming system |
| **Half-scale** | OPR variant using half distances on half-size table |
| **Preset** | Named terrain type bundling OPR properties |
| **LOS** | Line of sight |
| **Cluster** | Group of adjacent hexes sharing the same terrain type |
| **Coherency** | OPR rule requiring models to stay within specified distance |
| **Activation** | When a unit takes its turn to perform actions |

---

## License

Project code: MIT License
oi.hexmap.js: MIT License (ODI Leeds, 2021)

---

## Appendix A: oi.hexmap.js Type Declarations

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
    ready?: (this: Hexmap) => void;
  }

  interface LabelAttributes {
    hex: HexData;
    size: number;
    'font-size': number;
    x: number;
    y: number;
  }

  interface HexArea {
    data: HexData;
    hex: SVGGElement;
    path: SVGPathElement;
    label?: SVGTextElement;
  }

  class Hexmap {
    constructor(el: HTMLElement, options?: HexmapOptions);
    el: HTMLElement;
    areas: Record<string, HexArea>;
    mapping: HexJSON;
    
    load(file: string | HexJSON, callback?: () => void): this;
    updateColours(fn?: (region: string) => string): this;
    on(event: 'mouseover' | 'mouseout' | 'click', callback: (e: HexEvent) => void): this;
  }

  interface HexEvent {
    data: {
      hexmap: Hexmap;
      region: string;
      data: HexData;
    };
  }

  function ready(fn: () => void): void;
}

declare const OI: {
  hexmap: typeof OI.Hexmap;
  ready: typeof OI.ready;
};
```

---

## Appendix B: Example Component Implementation

### MapCanvas.tsx

```tsx
import { useRef, useEffect } from 'preact/hooks';
import { generateMap } from '../lib/generator';
import { ALL_PATTERNS } from '../lib/patterns';
import { TERRAIN_PRESETS } from '../lib/terrainPresets';
import type { GeneratorConfig, DisplayConfig } from '../types';

interface Props {
  generatorConfig: GeneratorConfig;
  displayConfig: DisplayConfig;
}

export function MapCanvas({ generatorConfig, displayConfig }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Generate HexJSON from config
    const hexJson = generateMap(generatorConfig);
    
    // Clear previous instance
    containerRef.current.innerHTML = '';
    
    // Create hexmap
    const hexmap = new OI.hexmap(containerRef.current, {
      hexjson: hexJson,
      patterns: ALL_PATTERNS,
      label: {
        show: displayConfig.showCoordinates || displayConfig.showElevation,
        clip: true,
        format: (txt, attr) => {
          const parts: string[] = [];
          if (displayConfig.showCoordinates) {
            parts.push(attr.hex.coordinate);
          }
          if (displayConfig.showElevation && attr.hex.elevation !== 0) {
            const sign = attr.hex.elevation > 0 ? '+' : '';
            parts.push(`${sign}${attr.hex.elevation}`);
          }
          return parts.join(' ');
        },
      },
      ready() {
        // Apply terrain patterns
        this.updateColours((region) => {
          const terrainId = this.areas[region].data.terrain;
          const preset = TERRAIN_PRESETS[terrainId];
          return preset?.pattern ? `url(#${preset.pattern})` : 'white';
        });
      },
    });

    return () => {
      containerRef.current?.replaceChildren();
    };
  }, [generatorConfig, displayConfig]);

  return (
    <div 
      ref={containerRef} 
      class="w-full aspect-[3/4] map-preview"
      id="hex-map"
    />
  );
}
```

### Seeded Random Generator

```typescript
// lib/random.ts

export function createSeededRandom(seed: string): () => number {
  let h = hashString(seed || String(Date.now()));
  
  return function mulberry32() {
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

### Hex Coordinate Utilities

```typescript
// lib/hexmath.ts

/**
 * Convert q,r coordinates to display label (A1, B2, etc.)
 */
export function coordToLabel(q: number, r: number): string {
  // Handle columns beyond Z (AA, AB, etc.) for future larger maps
  let col = '';
  let qTemp = q;
  do {
    col = String.fromCharCode(65 + (qTemp % 26)) + col;
    qTemp = Math.floor(qTemp / 26) - 1;
  } while (qTemp >= 0);
  
  const row = r + 1;
  return `${col}${row}`;
}

/**
 * Get the 6 neighboring hex coordinates for a given hex
 */
export function getNeighbors(q: number, r: number): Array<{ q: number; r: number }> {
  // Odd-q offset coordinate neighbors
  const isOddColumn = q % 2 === 1;
  
  if (isOddColumn) {
    return [
      { q: q + 1, r: r },     // East
      { q: q + 1, r: r + 1 }, // Southeast
      { q: q, r: r + 1 },     // South (down)
      { q: q - 1, r: r + 1 }, // Southwest
      { q: q - 1, r: r },     // West
      { q: q, r: r - 1 },     // North (up)
    ];
  } else {
    return [
      { q: q + 1, r: r - 1 }, // Northeast
      { q: q + 1, r: r },     // East
      { q: q, r: r + 1 },     // South (down)
      { q: q - 1, r: r },     // Southwest
      { q: q - 1, r: r - 1 }, // Northwest
      { q: q, r: r - 1 },     // North (up)
    ];
  }
}

/**
 * Calculate hex distance between two hexes
 */
export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  // Convert offset to cube coordinates for distance calculation
  const cube1 = offsetToCube(q1, r1);
  const cube2 = offsetToCube(q2, r2);
  
  return Math.max(
    Math.abs(cube1.x - cube2.x),
    Math.abs(cube1.y - cube2.y),
    Math.abs(cube1.z - cube2.z)
  );
}

function offsetToCube(q: number, r: number): { x: number; y: number; z: number } {
  const x = q;
  const z = r - (q - (q & 1)) / 2;
  const y = -x - z;
  return { x, y, z };
}
```
