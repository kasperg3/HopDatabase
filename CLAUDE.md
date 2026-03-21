# CLAUDE.md — HopDatabase

This file documents the codebase structure, development workflows, and conventions for AI assistants working in this repository.

## Project Overview

HopDatabase is a full-stack application that:
1. **Scrapes** hop variety data from 6 commercial hop suppliers (Python backend)
2. **Merges and normalizes** the data into a unified JSON dataset
3. **Visualizes** it via an interactive React web app deployed to GitHub Pages

Live site: https://kasperg3.github.io/HopDatabase

---

## Repository Structure

```
HopDatabase/
├── hop_database/               # Python package (scraping + data model)
│   ├── models/
│   │   └── hop_model.py        # HopEntry dataclass + analysis functions
│   ├── scrapers/               # One module per supplier
│   │   ├── yakima_chief.py
│   │   ├── yakima_valley_hops.py
│   │   ├── barth_haas.py
│   │   ├── hopsteiner.py       # Uses cached hopsteiner_raw_data.json
│   │   ├── crosby_hops.py
│   │   └── john_i_haas.py
│   ├── utils/
│   └── data/                   # Raw/cached data files
│       └── hopsteiner_raw_data.json
├── website/                    # React frontend
│   ├── public/
│   │   └── data/hops.json      # Final merged dataset (served statically)
│   └── src/
│       ├── components/         # 22 React components
│       ├── contexts/           # HopFilterContext (useReducer state)
│       ├── hooks/              # Custom React hooks
│       ├── services/           # HopDataService singleton
│       └── utils/              # Utilities, constants, presets
├── run_scrapers.py             # Main ETL orchestration script
├── setup.py                    # Python package config (entry point: hop-scraper)
├── requirements.txt            # Python deps: requests, beautifulsoup4
├── notebook.ipynb              # Jupyter analysis notebook
└── .github/workflows/
    ├── ci.yaml                 # Runs scrapers monthly, uploads hops.json artifacts
    └── deploy.yml              # Builds + deploys React app to GitHub Pages
```

---

## Python Backend

### Data Model (`hop_database/models/hop_model.py`)

The central data structure is the `HopEntry` dataclass:

```python
@dataclass
class HopEntry:
    name: str
    country: str = ""
    source: str = ""
    href: str = ""
    alpha_from, alpha_to: Union[str, float]   # Alpha acid % range
    beta_from, beta_to: Union[str, float]     # Beta acid % range
    oil_from, oil_to: Union[str, float]       # Oil content mL/100g range
    co_h_from, co_h_to: Union[str, float]    # Cohumulone % range
    notes: List[str]
    standardized_aromas: Dict[str, float]    # Keys = STANDARD_AROMAS (0–5 scale)
    raw_aroma_data: Dict[str, float]         # Source-specific, pre-mapping
    storage: str
    additional_properties: Dict             # Hopsteiner extended fields
```

**9 standard aroma categories** (all values 0–5 after scaling):
`Citrus`, `Resin/Pine`, `Spice`, `Herbal`, `Grassy`, `Floral`, `Berry`, `Stone Fruit`, `Tropical Fruit`

**Key methods:**
- `set_standardized_aromas(source_name, source_aroma_data)` — maps source-specific aroma labels to standard categories using `AROMA_MAPPINGS`
- `get_brewing_purpose()` → `"Bittering"` / `"Aroma"` / `"Dual Purpose"` based on alpha/oil thresholds
- `to_dict()` — serializes to JSON-ready dict (note: `standardized_aromas` is serialized as key `"aromas"`)

**Serialization note:** `HopEntry.to_dict()` outputs `"aromas"` (not `"standardized_aromas"`) — the frontend reads `hop.aromas`.

### Scrapers

Each scraper lives in `hop_database/scrapers/<name>.py` and exposes a single function:

```python
def scrape(save=False) -> List[HopEntry]:
    ...
```

- `save=False` is the norm; the orchestrator handles saving.
- Scrapers parse HTML with `BeautifulSoup4`, or in Hopsteiner's case, read from a cached JSON file (`hop_database/data/hopsteiner_raw_data.json`).
- After extracting raw aroma data, scrapers call `hop.set_standardized_aromas(source_key, aroma_dict)`.

**Source keys used in `AROMA_MAPPINGS`:**
| Scraper | Source key |
|---|---|
| yakima_chief | `"yakima"` |
| barth_haas | `"barth"` |
| hopsteiner | `"hopsteiner"` |
| crosby_hops | `"crosby"` |
| john_i_haas | *(no aroma mapping defined yet)* |
| yakima_valley_hops | *(no aroma mapping defined yet)* |

### ETL Pipeline (`run_scrapers.py`)

The `main()` function runs the full pipeline:

1. **Extract** — runs all 6 scrapers (YCH US + EU are deduped by name before combining)
2. **Scale aromas** — `scale_aroma_values_by_source()` normalizes each source's aroma values to 0–5 based on that source's overall maximum
3. **Merge** — `merge_hops()` groups hops by normalized name, applies `MERGE_NAME_ALIASES` for known equivalents, then merges:
   - Brewing ranges: `min(from values)` / `max(to values)` across sources
   - Aromas: average across sources that have a non-zero value
   - Country: first non-empty value
   - Source, href, storage: joined with ` / ` or ` | `
4. **Save** — writes to `data/hops.json`, `data/combined.json`, and `website/public/data/hops.json`

**Name normalization** (`normalize_hop_name`):
- Lowercases, strips trademark symbols (`®`, `™`), removes content in parentheses, strips trailing 2–3 char suffixes (e.g. `-US`)

**Known name aliases** (`MERGE_NAME_ALIASES` in `run_scrapers.py`):
- Hallertauer variants → `"hallertauer mittelfrüh"`
- `"East kent goldings"` → `"East kent golding"`
- `"Fuggle"` → `"Fuggles"`

To run the full pipeline locally:
```bash
pip install -r requirements.txt
python run_scrapers.py
```

Or via the installed entry point:
```bash
pip install -e .
hop-scraper
```

---

## React Frontend (`website/`)

### Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 18.2.0 | UI framework |
| Mantine UI | 7.3.2 | Component library + theming |
| Plotly.js | 2.27.1 | Spider/radar charts |
| Recharts | 3.1.0 | Additional charts |
| @tabler/icons-react | 2.46.0 | Icons |
| CRACO | 7.1.0 | Webpack config override |
| gh-pages | 6.1.0 | GitHub Pages deployment |

### Key Scripts

```bash
cd website
npm install
npm start          # Dev server (hot reload)
npm test           # Run tests
npm run build      # Production build + bundle analysis
npm run build:prod # Production build without source maps
npm run deploy     # Build (no source maps) + push to gh-pages branch
```

### Component Architecture

**Entry points:**
- `src/index.js` → mounts React app
- `src/App.js` → wraps with Mantine `MantineProvider` + `HopFilterContext`
- `src/AppContent.js` → main layout, data loading, UI orchestration

**Core components:**
| Component | Purpose |
|---|---|
| `HopSelector.js` | Multi-select hop picker with all filter controls |
| `AromaFilters.js` | Click-cycle aroma filters (none → high → low) |
| `BrewingParameterFilters.js` | Range sliders for alpha, cohumulone, oil |
| `QuickStylePresets.js` | Quick-select brewing style presets |
| `StylePresetsModal.js` | Modal for browsing all style presets |
| `FilterSummary.js` | Displays active filter count/state |
| `LazySpiderChart.js` | Lazy-loaded wrapper for the radar chart |
| `SpiderChart.js` | Plotly.js radar chart for aroma comparison |
| `BrewingSummary.js` | Brewing stats and recommendations |
| `SelectedHops.js` | List display of selected hops |
| `BrewingParametersComparison.js` | Side-by-side parameter table |

**State management:**
- `src/contexts/HopFilterContext.js` — `useReducer`-based global state for all filter state (aroma filters, parameter ranges, thresholds, selected hops)
- `src/hooks/useHopFiltering.js` — filtering logic (standalone)
- `src/hooks/useHopFilteringWithContext.js` — filtering logic connected to context
- `src/services/HopDataService.js` — singleton that fetches and caches `hops.json`

**Utilities:**
- `src/utils/hopUtils.js` — hop-specific calculations
- `src/utils/hopConstants.js` — shared constants
- `src/components/presets.js` — brewing style preset definitions
- `src/components/constants.js` — component-level constants

### Data Loading

The frontend fetches `public/data/hops.json` at runtime via `HopDataService`. The JSON structure per hop:

```json
{
  "name": "Citra",
  "country": "USA",
  "source": "Yakima Chief / Barth Haas",
  "href": "https://...",
  "alpha_from": 11.0,
  "alpha_to": 13.0,
  "beta_from": 3.5,
  "beta_to": 4.5,
  "oil_from": 2.2,
  "oil_to": 2.8,
  "co_h_from": 22.0,
  "co_h_to": 24.0,
  "storage": "",
  "notes": ["tropical", "citrus"],
  "aromas": {
    "Citrus": 4.5,
    "Resin/Pine": 1.0,
    "Spice": 0.5,
    "Herbal": 0.0,
    "Grassy": 0.0,
    "Floral": 1.5,
    "Berry": 2.0,
    "Stone Fruit": 1.0,
    "Tropical Fruit": 4.0
  },
  "additional_properties": {},
  "brewing_stats": {
    "brewing_purpose": "Aroma",
    "avg_alpha": 12.0,
    "avg_beta": 4.0,
    "avg_oil": 2.5,
    "avg_cohumulone": 23.0,
    "alpha_classification": "High",
    "oil_classification": "High"
  }
}
```

---

## CI/CD

### Python CI (`.github/workflows/ci.yaml`)

- **Triggers:** Scheduled monthly (1st of month 00:00 UTC), tag pushes (`v*`), manual dispatch
- **Steps:** Python 3.10 → `pip install` → `python run_scrapers.py` → upload `hops.json` + `combined.json` as artifacts
- **Release job:** Creates GitHub release with JSON data on tag pushes

### Frontend Deploy (`.github/workflows/deploy.yml`)

- **Triggers:** Push to `main`, pull requests
- **Steps:** Node.js 18 → `npm ci` → `npm run build:prod` → deploy to GitHub Pages
- **Permissions:** Requires `pages: write` and `id-token: write`

---

## Development Conventions

### Adding a New Scraper

1. Create `hop_database/scrapers/<supplier_name>.py`
2. Implement `def scrape(save=False) -> List[HopEntry]:`
3. Use `requests` + `BeautifulSoup4` to parse the supplier's website
4. Map aromas using `hop.set_standardized_aromas(source_key, aroma_dict)` — add a new entry to `AROMA_MAPPINGS` in `hop_model.py` if needed
5. Import and call from `run_scrapers.py` → add to `combined_hop_entries`

### Adding Hop Name Aliases

Add to `MERGE_NAME_ALIASES` in `run_scrapers.py`:
```python
MERGE_NAME_ALIASES = {
    "normalized source name": "normalized canonical name",
}
```
Names are already lowercased before lookup — use lowercase keys.

### Aroma Mapping Convention

When adding a new source's aroma categories to `AROMA_MAPPINGS` in `hop_model.py`:
- Key: source-specific label (exact string from scraper data)
- Value: one of the 9 `STANDARD_AROMAS` strings
- Multiple source categories can map to the same standard category (max intensity wins)

### Frontend Component Conventions

- Use Mantine UI components for layout and UI elements
- Aroma filter state cycles: `none` → `high` → `low` → `none`
- All global filter state lives in `HopFilterContext` — don't add local state for filters
- Charts are lazy-loaded; wrap new heavy components similarly with `React.lazy` + `Suspense`
- Data access always goes through `HopDataService` (singleton), never fetch directly

### Python Conventions

- Python 3.8+ compatibility required
- Dependencies stay minimal — only add to `requirements.txt` if essential
- Scrapers must gracefully handle network failures (don't crash the whole pipeline)
- All aroma values must be 0–5 after `scale_aroma_values_by_source()` runs

---

## Key Files Quick Reference

| File | Purpose |
|---|---|
| `hop_database/models/hop_model.py` | Data model, aroma mappings, serialization |
| `run_scrapers.py` | ETL orchestration, name normalization, merging |
| `website/public/data/hops.json` | Merged hop dataset consumed by frontend |
| `website/src/contexts/HopFilterContext.js` | Global React state |
| `website/src/services/HopDataService.js` | Data fetching singleton |
| `website/src/components/SpiderChart.js` | Aroma radar chart |
| `.github/workflows/ci.yaml` | Scraper automation |
| `.github/workflows/deploy.yml` | Frontend deployment |
