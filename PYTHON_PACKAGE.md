# HopDatabase Python Package

## Installation

### Development Installation
```bash
# Clone the repository
git clone https://github.com/kasperg3/HopDatabase.git
cd HopDatabase

# Install in development mode
pip install -e .
```

### Production Installation
```bash
pip install hop-database
```

## Usage

### Quick Start
```python
from hop_database import HopEntry, save_hop_entries
from hop_database.scrapers import yakima_chief, barth_haas, hopsteiner

# Run all scrapers
ych_hops = yakima_chief.scrape()
bh_hops = barth_haas.scrape()
hs_hops = hopsteiner.scrape()

# Combine and save data
all_hops = ych_hops + bh_hops + hs_hops
save_hop_entries(all_hops, 'data/hops.json')

print(f"Scraped {len(all_hops)} hop varieties")
```

### Command Line Usage
```bash
# Run the scraper script
python run_scrapers.py

# Or use the installed command (if installed via pip)
hop-scraper
```

### Individual Scrapers

#### Yakima Chief Hops
```python
from hop_database.scrapers import yakima_chief

hops = yakima_chief.scrape()
print(f"Found {len(hops)} Yakima Chief hops")
```

#### BarthHaas
```python
from hop_database.scrapers import barth_haas

hops = barth_haas.scrape()
print(f"Found {len(hops)} BarthHaas hops")
```

#### Hopsteiner
```python
from hop_database.scrapers import hopsteiner

hops = hopsteiner.scrape()
print(f"Found {len(hops)} Hopsteiner hops")
```

### Working with Hop Data

#### Creating Hop Entries
```python
from hop_database.models import HopEntry

hop = HopEntry(
    name="Cascade",
    alpha_from="4.5",
    alpha_to="7.0",
    beta_from="5.0",
    beta_to="7.0",
    oil_from="0.8",
    oil_to="1.5",
    co_h_from="33",
    co_h_to="40",
    country="USA",
    aroma=["citrus", "floral"],
    source="Manual Entry"
)
```

#### Saving and Loading Data
```python
from hop_database.models import save_hop_entries, load_hop_entries

# Save hop entries to JSON
save_hop_entries([hop], 'my_hops.json')

# Load hop entries from JSON
loaded_hops = load_hop_entries('my_hops.json')
```

#### Working with Aroma Mappings
```python
from hop_database.models import STANDARD_AROMAS, AROMA_MAPPINGS

print("Standard aroma categories:", STANDARD_AROMAS)
print("Yakima Chief mappings:", AROMA_MAPPINGS['yakima'])
```

## Package Structure

```
hop_database/
├── __init__.py              # Main package interface
├── models/                  # Data models and validation
│   ├── __init__.py
│   └── hop_model.py        # HopEntry dataclass and utilities
├── scrapers/               # Data collection modules
│   ├── __init__.py
│   ├── yakima_chief.py     # Yakima Chief Hops scraper
│   ├── barth_haas.py       # BarthHaas scraper
│   └── hopsteiner.py       # Hopsteiner scraper
├── utils/                  # Utility functions
│   └── __init__.py
└── data/                   # Cached data files
    ├── hopsteiner_raw_data.json
    ├── bh.html
    └── yvh_html.html
```

## Data Format

Each hop entry follows this standardized format:

```python
@dataclass
class HopEntry:
    name: str
    alpha_from: str
    alpha_to: str
    beta_from: str
    beta_to: str
    oil_from: str
    oil_to: str
    co_h_from: str
    co_h_to: str
    country: str
    aroma: List[str]
    source: str
    description: str = ""
    purpose: str = ""
    storage: str = ""
    substitutes: List[str] = field(default_factory=list)
    standardized_aroma: List[str] = field(default_factory=list)
```

## Error Handling

The scrapers include robust error handling for network issues and parsing errors:

```python
try:
    hops = yakima_chief.scrape()
except Exception as e:
    print(f"Error scraping Yakima Chief: {e}")
    hops = []
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
