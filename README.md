# OPR Hex Battle Map Generator v2

A web-based procedural hex map generator for One Page Rules (OPR) tabletop wargaming. Generate balanced, print-ready battle maps that follow OPR terrain placement guidelines.

## Project History

This is a complete reimagining of the original OPR hex map generator. The v1 implementation (archived in `/archive`) became overly complex due to:
- Dependency on oi.hexmap.js library which added unnecessary abstraction
- Named terrain presets (Forest, Ruins, etc.) instead of property-based terrain
- Intertwined generation, validation, and rendering logic

The v2 implementation is built from scratch with:
- Pure SVG rendering (no external hex library)
- Property-based terrain system (10 types based on OPR rules)
- Clean separation of concerns
- All constants in one place (no magic numbers)

## Features

### Implemented ✅

- **36×24 hex grid** - Half-scale OPR table (1 hex = 1 inch)
- **10 property-based terrain types** with distinct visual patterns
- **Procedural generation** following OPR terrain placement guidelines
- **Elevation system** with concentric hexagon contours (solid for +, dashed for -)
- **Map statistics modal** showing OPR guideline compliance
- **Seed-based generation** for reproducible/shareable maps
- **Print-ready output** - US Letter landscape, WYSIWYG preview
- **Responsive sidebar** with density, terrain mix, and elevation controls
- **Map legend for printed output** with multiple display and print options


### Not Yet Implemented

- [ ] Actual print stylesheet testing/refinement
- [ ] SVG download/export
- [ ] Shareable URL with seed parameter
- [ ] Thematic background layer (future feature - procedural terrain illustration behind hex grid)

## Terrain System

The terrain system is based on OPR's combinatorial terrain properties. Instead of named terrain types (Forest, Ruins, etc.), we use property combinations that map directly to game rules.

### The 10 Terrain Types

| Type | Properties | Visual Pattern | OPR Effect |
|------|------------|----------------|------------|
| **Open** | None | White fill | No special rules |
| **Blocking** | Impassable + Blocks LOS | Solid dark (#1a1a1a) | Can't enter, can't see through |
| **Impassable** | Can't enter | Gray + wavy lines | Can't enter, CAN see through |
| **Cover** | +1 Defense | Solid rotated rectangles | +1 Defense when in/behind |
| **Difficult** | Slows movement | Diagonal lines (dense) | Max 3 hex movement |
| **Dangerous** | Causes wounds | Small X marks (dense) | Roll for wounds |
| **Cover + Difficult** | Both | Rectangles + muted diagonals | Forest-like terrain |
| **Cover + Dangerous** | Both | Rectangles + X marks | Dangerous cover |
| **Difficult + Dangerous** | Both | Diagonals + X marks | Hazardous slow terrain |
| **Cover + Difficult + Dangerous** | All three | Dense crosshatch + rectangles | Death world terrain |

### Pattern Design Philosophy

- **Cover** = Solid rotated rectangles (debris/rubble providing cover)
- **Difficult** = Diagonal lines (movement hindrance, like hatching)
- **Dangerous** = X marks (universal hazard symbol)
- **Combinations** layer these elements additively
- All patterns use dark gray (#222) on white for print-friendliness

## Elevation System

Elevation represents height differences on the battlefield. Per OPR rules:
- ±1 level difference = Climbable (costs extra movement)
- ±2+ level difference = Impassable (must find alternate route)

### Visual Representation

- **Positive elevation (+1, +2, etc.)**: Concentric solid inner hexagons
- **Negative elevation (-1, -2)**: Concentric dashed inner hexagons
- Number of rings = elevation level
- Elevation label displayed in center of hex

### Elevation Constraints

- Blocking and Impassable terrain cannot have elevation
- Generator validates that all elevated hexes have climbable ramps (adjacent hexes at ±1 level)

## OPR Terrain Guidelines

The generator targets these placement guidelines from the OPR rulebook:

| Guideline | Target | Purpose |
|-----------|--------|---------|
| Coverage | ≥25% of map | Enough terrain for tactical play |
| Blocking LOS | ≥50% of terrain | Prevent shooting galleries |
| Cover | ≥33% of terrain | Defensive positions |
| Difficult | ≥33% of terrain | Movement challenges |
| Dangerous | 2+ clusters | Risk/reward decisions |
| Edge-to-Edge LOS | Blocked | No clear sightlines across map |
| Max Gap | ≤12 hexes | No huge empty zones |
| Min Passage | ≥6 hexes | Units can move between terrain |

The Map Statistics modal (📊 button) shows compliance with these guidelines.

## Grid Specifications

| Specification | Value | Rationale |
|---------------|-------|-----------|
| Grid size | 36 × 24 hexes | Half-scale OPR table |
| Hex orientation | Flat-topped | Best fit for landscape page |
| Coordinate system | odd-q offset | Standard for flat-topped hexes |
| Page size | US Letter landscape | 11" × 8.5" |
| Margins | 0.2" | Minimal safe margin for printers |
| Hex width | ~28px | Calculated to fill page width |

### Hex Geometry (Flat-topped)

```
      ___
     /   \      Width (w) = flat edge to flat edge
    /     \     Height (h) = w × √3/2 ≈ w × 0.866
    \     /     Horizontal spacing = w × 0.75 (hexes interlock)
     \___/      Odd columns offset down by h/2
```

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Layout, state management
│
├── components/
│   ├── Sidebar.tsx          # Controls panel
│   ├── MapPreview.tsx       # SVG hex grid renderer
│   └── StatsModal.tsx       # OPR compliance display
│
├── lib/
│   ├── constants.ts         # All magic numbers with names
│   ├── types.ts             # TypeScript interfaces
│   ├── random.ts            # Seeded PRNG (mulberry32)
│   ├── hexUtils.ts          # Hex math (neighbors, distance, geometry)
│   ├── patterns.ts          # SVG pattern definitions
│   ├── generator.ts         # Terrain placement algorithm
│   └── stats.ts             # Map statistics calculation
│
└── styles/
    └── index.css            # Tailwind + print styles
```

## Key Files Explained

### `constants.ts`
All configuration values in one place:
- Grid dimensions (36×24)
- Print dimensions (US Letter landscape)
- Hex geometry calculations
- OPR guideline targets
- Terrain piece size ranges
- Elevation limits
- Default slider values

### `types.ts`
TypeScript interfaces:
- `TerrainType` - The 10 terrain types as a union type
- `TerrainProperties` - Boolean flags for each OPR property
- `TERRAIN_PROPERTIES` - Mapping of terrain types to their properties
- `HexData` - Data for a single hex (col, row, terrain, elevation)
- `HexGrid` - 2D array of HexData
- `GeneratorConfig` - All generation parameters
- `MapStats` - Statistics for OPR compliance
- `DisplayConfig` - UI display options

### `patterns.ts`
SVG pattern definitions:
- Each terrain type has a pattern with specific tile size
- Patterns use `patternUnits="userSpaceOnUse"` for consistent scaling
- `getTerrainFill()` returns the appropriate fill value for any terrain
- `generatePatternDefs()` outputs all patterns for SVG `<defs>`

### `generator.ts`
Procedural generation algorithm:
1. Create empty grid (all open terrain)
2. Calculate piece count based on density slider
3. Select terrain types based on mix percentages
4. Place terrain as contiguous clusters with spacing constraints
5. Validate and fix edge-to-edge LOS
6. Add elevation if enabled
7. Validate elevation ramps

### `hexUtils.ts`
Hex coordinate utilities:
- `hexDistance()` - Calculate distance between hexes
- `getValidNeighbors()` - Get adjacent hexes within grid
- `hexCenter()` - Calculate pixel position of hex center
- `hexPoints()` - Generate SVG polygon points for hex shape

## UI Controls

### Sidebar Controls

| Control | Range | Effect |
|---------|-------|--------|
| Seed | Text | Reproducible generation |
| Density | 0.1 - 1.0 | Number of terrain pieces (10-25) |
| Blocking | 0% - 100% | Proportion of blocking terrain |
| Cover | 0% - 100% | Proportion of cover terrain |
| Difficult | 0% - 100% | Proportion of difficult terrain |
| Dangerous | 0% - 100% | Proportion of dangerous terrain |
| Piece Size | Small - Large | Size of terrain clusters |
| Elevation | On/Off | Enable elevation system |
| Max Level | 1 - 4 | Maximum elevation height |
| Intensity | 0% - 100% | Amount of elevation variation |

### Display Options

- **Show border** - Draw border around hex grid
- **Show seed** - Display seed watermark for regeneration

### Buttons

- **Generate** - Regenerate map with current settings
- **↺** - Reset all sliders to defaults
- **Print / Save** - Open browser print dialog
- **📊** - Show map statistics modal

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling

## Archive

The `/archive` folder contains the v1 implementation for reference:
- `src/` - Original source code
- `PROJECT_FOUNDATION.md` - Original design document (still useful for OPR rules reference)
- `opr-rulebook-content.txt` - Extracted OPR terrain rules
- `pattern-*.html` - Pattern exploration/testing files

## Future Enhancements

### Planned

1. **Print refinement** - Test and fix print stylesheet
2. **SVG export** - Download map as SVG file
3. **Share URLs** - Encode seed in URL for sharing
4. **Map legend** - Printable terrain key

### Ideas

1. **Thematic backgrounds** - Procedural terrain illustration behind hex grid (documented in original design)
2. **Custom terrain naming** - Let users rename terrain types (e.g., "Cover" → "Ruins")
3. **Multiple grid sizes** - Support different table sizes
4. **Deployment zone overlay** - Show 6-hex deployment areas

## Playing OPR with Hex Maps

### Quick Reference

| OPR Distance (Half-Scale) | Hexes |
|---------------------------|-------|
| 1" (base contact) | 1 hex |
| 3" (advance) | 3 hexes |
| 6" (rush/charge, deployment) | 6 hexes |
| 9" (coherency) | 9 hexes |
| 12" (standard range) | 12 hexes |

### Movement

- Count destination hex, not starting hex
- Difficult terrain = max 3 hex movement for entire activation
- Climbing ±1 elevation = costs extra movement
- Climbing ±2+ elevation = blocked, find alternate route

### Line of Sight

- Blocking terrain = cannot see through
- Other terrain = can see into/out of, rules vary
- Draw line from hex center to hex center

### Cover

- Single model in Cover hex = +1 Defense
- Multi-model unit with majority in Cover = +1 Defense

## License

MIT

---

*Generated maps are intended for personal use with One Page Rules games. OPR rules and army lists are © One Page Rules.*
