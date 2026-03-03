# OPR Hex Battle Map Generator

A procedural hex map generator for One Page Rules tabletop wargaming. Generates balanced, print-ready battle maps that follow OPR terrain placement guidelines.

## Features

- 36×24 hex grid (half-scale OPR table, 1 hex = 1 inch)
- 10 property-based terrain types mapped to OPR rules
- Elevation system with contour visualization
- Seed-based generation for reproducible maps
- Symmetry mode for competitive balance
- Map statistics showing OPR guideline compliance
- Print stylesheet for US Letter and A4
- SVG and PNG export

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Terrain System

Terrain is defined by OPR's combinatorial properties rather than named types. Each hex can have any combination of these properties:

| Property | Effect |
|----------|--------|
| Blocking | Blocks LOS and movement |
| Impassable | Blocks movement only |
| Cover | +1 Defense |
| Difficult | Max 3" movement |
| Dangerous | Roll for wounds |

This produces 10 terrain types:

| Type | Pattern | Properties |
|------|---------|------------|
| Open | White | None |
| Blocking | Solid dark | Blocks LOS + movement |
| Impassable | Gray + waves | Blocks movement |
| Cover | Rectangles | +1 Defense |
| Difficult | Diagonal lines | Slows movement |
| Dangerous | X marks | Causes wounds |
| Cover + Difficult | Rectangles + lines | Forest-like |
| Cover + Dangerous | Rectangles + X | Hazardous cover |
| Difficult + Dangerous | Lines + X | Hazardous slow |
| Cover + Difficult + Dangerous | Crosshatch + rectangles | Death world |

## Elevation

Elevation represents height differences:

- Positive (+1, +2, etc.): Solid concentric hexagon contours
- Negative (-1, -2): Dashed concentric hexagon contours
- ±1 level difference: Climbable (extra movement cost)
- ±2+ level difference: Impassable

The generator validates that all elevated hexes have accessible ramps.

## Controls

### Generation
- Seed: Text input for reproducible maps
- Density: 0-100% terrain coverage
- Terrain Mix: Sliders for blocking, impassable, cover, difficult, dangerous proportions
- Piece Size: Small (1-3 hexes), medium (4-8), or large (8-12)
- Spacing: How spread out terrain clusters are
- Symmetry: Mirror terrain top-to-bottom for competitive play
- Strict LOS: Require blocking terrain at all 3 strategic rows vs any 2

### Elevation
- Enable/disable elevation
- Max Level: 1-4
- Intensity: Amount of elevation variation

### Display
- Border: Show/hide grid border
- Seed: Show/hide seed watermark
- Legend: None, on map (left/right), or separate page

### Output
- Generate: Regenerate with current settings
- Reset: Return all sliders to defaults
- Print: Open browser print dialog
- Export: Download as SVG or PNG
- Stats: View OPR guideline compliance

## OPR Guidelines

The generator targets these placement guidelines:

| Guideline | Target |
|-----------|--------|
| Coverage | ≥25% of map |
| Blocking LOS | ≥50% of terrain |
| Cover | ≥33% of terrain |
| Difficult | ≥33% of terrain |
| Dangerous | 2+ clusters |
| Edge-to-Edge LOS | Blocked at strategic rows |
| Max Gap | ≤12 hexes |
| Min Passage | ≥6 hexes |

## Project Structure

```
src/
├── App.tsx              # Layout and state
├── main.tsx             # Entry point
├── components/
│   ├── Legend.tsx       # Terrain legend (overlay and separate page)
│   ├── MapPreview.tsx   # SVG hex grid renderer
│   ├── Sidebar.tsx      # Controls panel
│   └── StatsModal.tsx   # OPR compliance display
├── lib/
│   ├── constants.ts     # Grid dimensions, OPR targets, defaults
│   ├── export.ts        # SVG/PNG export
│   ├── generator.ts     # Terrain placement algorithm
│   ├── hexUtils.ts      # Hex math (neighbors, distance, geometry)
│   ├── patterns.ts      # SVG pattern definitions
│   ├── random.ts        # Seeded PRNG
│   ├── stats.ts         # Map statistics calculation
│   └── types.ts         # TypeScript interfaces
└── styles/
    └── index.css        # Tailwind + print styles
```

## Grid Specifications

| Spec | Value |
|------|-------|
| Grid size | 36 × 24 hexes |
| Hex orientation | Flat-topped |
| Coordinate system | odd-q offset |
| Page size | US Letter landscape |
| Margins | 0.2" |

## Hex Distance Reference

| OPR Distance | Hexes |
|--------------|-------|
| 1" (base contact) | 1 |
| 3" (advance) | 3 |
| 6" (rush/charge) | 6 |
| 9" (coherency) | 9 |
| 12" (standard range) | 12 |

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting
```

## Archive

The `/archive` folder contains the v1 implementation for reference. The v2 rewrite replaced the external hex library dependency with pure SVG rendering and switched from named terrain presets to the property-based system.

## License

GPL-3.0

---

Generated maps are for personal use with One Page Rules games. OPR rules and army lists are © One Page Rules.
