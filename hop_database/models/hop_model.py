# your_project_folder/models/hop_model.py

"""
Hop Data Model

This module defines the standard data structure for hop entries and provides
utilities for creating, validating, and normalizing hop data across all sources.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union
import json
import os

# Standard aroma categories
STANDARD_AROMAS = [
    "Citrus",
    "Resin/Pine",
    "Spice",
    "Herbal",
    "Grassy",
    "Floral",
    "Berry",
    "Stone Fruit",
    "Tropical Fruit",
]

# Mapping from source-specific categories to standard categories
AROMA_MAPPINGS = {
    # Yakima Chief Hops mappings
    "yakima": {
        "Sweet Aromatic": "Floral",
        "Berry": "Berry",
        "Stone fruit": "Stone Fruit",
        "Pomme": "Stone Fruit",
        "Melon": "Tropical Fruit",
        "Tropical": "Tropical Fruit",
        "Citrus": "Citrus",
        "Floral": "Floral",
        "Herbal": "Herbal",
        "Vegetal": "Grassy",
        "Grassy": "Grassy",
        "Earthy": "Herbal",
        "Woody": "Resin/Pine",
        "Spicy": "Spice",
    },
    # Barth Haas mappings
    "barth": {
        "Citrus": "Citrus",
        "Sweetfruits": "Stone Fruit",
        "Greenfruits": "Stone Fruit",
        "Redberries": "Berry",
        "Creamcaramel": "Floral",
        "Woody": "Resin/Pine",
        "Menthol": "Herbal",
        "Herbaceous": "Herbal",
        "Spicy": "Spice",
        "Green": "Grassy",
        "Vegetal": "Grassy",
        "Flowery": "Floral",
    },
    # Hopsteiner mappings
    "hopsteiner": {
        "Fruity": "Stone Fruit",
        "Floral": "Floral",
        "citrusy": "Citrus",
        "Spicy": "Spice",
        "Herbal": "Herbal",
        "Tropical": "Tropical Fruit",
        "Berry": "Berry",
        "Woody": "Resin/Pine",
        "Grassy": "Grassy",
        "Resinous": "Resin/Pine",
        "Pine": "Resin/Pine",
    },
    "crosby": {
        "Citrus": "Citrus",
        "Piney/Resinous": "Resin/Pine",
        "Spicy": "Spice",
        "Herbal/Earthy": "Herbal",
        "Grassy": "Grassy",
        "Floral": "Floral",
        "Berry": "Berry",
        "Stone Fruit": "Stone Fruit",
        "Tropical/Fruit": "Tropical Fruit",
        # Unmapped from source: "Cheesy/Sweaty", "Pungent/Dank", "Woody/Tobacco", "Catty", "Onion/Garlic"
    },
}


@dataclass
class HopEntry:
    """
    Standardized hop data model used across all sources.
    All scrapers should create instances of this class.
    """

    # Basic Information
    name: str
    country: str = ""
    source: str = ""
    href: str = ""

    # Brewing Parameters
    alpha_from: Union[str, float] = ""
    alpha_to: Union[str, float] = ""
    beta_from: Union[str, float] = ""
    beta_to: Union[str, float] = ""
    oil_from: Union[str, float] = ""
    oil_to: Union[str, float] = ""
    co_h_from: Union[str, float] = ""
    co_h_to: Union[str, float] = ""

    # Aroma Information
    notes: List[str] = field(default_factory=list)
    standardized_aromas: Dict[str, int] = field(default_factory=dict)

    # Source-specific data (optional)
    raw_aroma_data: Dict[str, Union[int, float]] = field(default_factory=dict)

    # Additional properties (for Hopsteiner extended data)
    additional_properties: Dict[str, Union[str, float, int]] = field(
        default_factory=dict
    )

    def __post_init__(self):
        """Initialize standardized aromas with default values if not provided."""
        if not self.standardized_aromas:
            self.standardized_aromas = {aroma: 0 for aroma in STANDARD_AROMAS}

    def set_standardized_aromas(
        self, source_name: str, source_aroma_data: Optional[Dict] = None
    ):
        """
        Set standardized aroma values based on source-specific data.

        Args:
            source_name: Source identifier ('yakima', 'barth', 'hopsteiner')
            source_aroma_data: Dictionary of source-specific aroma intensities
        """
        # Initialize with zeros
        self.standardized_aromas = {aroma: 0 for aroma in STANDARD_AROMAS}

        # Get mapping for this source
        source_mapping = AROMA_MAPPINGS.get(source_name.lower(), {})

        # Process structured aroma data
        if source_aroma_data:
            self.raw_aroma_data = source_aroma_data
            for source_aroma, intensity in source_aroma_data.items():
                # Map to standard category
                standard_aroma = source_mapping.get(source_aroma)
                if standard_aroma and standard_aroma in self.standardized_aromas:
                    # Take the maximum intensity if multiple source categories map to same standard category
                    current_intensity = (
                        int(intensity) if isinstance(intensity, (int, float)) else 0
                    )
                    self.standardized_aromas[standard_aroma] = max(
                        self.standardized_aromas[standard_aroma], current_intensity
                    )

    def get_brewing_purpose(self) -> str:
        """
        Determine the hop's primary brewing purpose based on alpha acid and oil content.

        Returns:
            str: 'Bittering', 'Aroma', or 'Dual Purpose'
        """
        avg_alpha = self.get_average_alpha()
        avg_oil = self.get_average_oil()

        if avg_alpha >= 10 and avg_oil < 2:
            return "Bittering"
        elif avg_alpha < 8 and avg_oil >= 1.5:
            return "Aroma"
        else:
            return "Dual Purpose"

    def get_average_alpha(self) -> float:
        """Get average alpha acid percentage."""
        return self._get_average_value(self.alpha_from, self.alpha_to)

    def get_average_beta(self) -> float:
        """Get average beta acid percentage."""
        return self._get_average_value(self.beta_from, self.beta_to)

    def get_average_oil(self) -> float:
        """Get average oil content."""
        return self._get_average_value(self.oil_from, self.oil_to)

    def get_average_cohumulone(self) -> float:
        """Get average cohumulone percentage."""
        return self._get_average_value(self.co_h_from, self.co_h_to)

    def _get_average_value(
        self, from_val: Union[str, float], to_val: Union[str, float]
    ) -> float:
        """Helper method to calculate average of range values."""

        def parse_value(val):
            if isinstance(val, (int, float)):
                return float(val)
            if isinstance(val, str):
                # Remove any non-numeric characters and parse
                cleaned = "".join(c for c in val if c.isdigit() or c == ".")
                try:
                    return float(cleaned) if cleaned else 0.0
                except ValueError:
                    return 0.0
            return 0.0

        from_parsed = parse_value(from_val)
        to_parsed = parse_value(to_val)

        if from_parsed == 0 and to_parsed == 0:
            return 0.0
        if to_parsed == 0:
            return from_parsed
        if from_parsed == 0:
            return to_parsed
        return (from_parsed + to_parsed) / 2

    def get_brewing_stats(self) -> Dict[str, Union[str, float]]:
        """
        Get comprehensive brewing statistics for this hop.

        Returns:
            Dict containing brewing purpose, averages, and classifications
        """
        return {
            "brewing_purpose": self.get_brewing_purpose(),
            "avg_alpha": round(self.get_average_alpha(), 1),
            "avg_beta": round(self.get_average_beta(), 1),
            "avg_oil": round(self.get_average_oil(), 2),
            "avg_cohumulone": round(self.get_average_cohumulone(), 1),
            "alpha_classification": self._classify_alpha(self.get_average_alpha()),
            "oil_classification": self._classify_oil(self.get_average_oil()),
        }

    def _classify_alpha(self, alpha: float) -> str:
        """Classify alpha acid level."""
        if alpha >= 10:
            return "High"
        elif alpha >= 6:
            return "Medium"
        else:
            return "Low"

    def _classify_oil(self, oil: float) -> str:
        """Classify oil content level."""
        if oil >= 2.5:
            return "High"
        elif oil >= 1.5:
            return "Medium"
        else:
            return "Low"

    def to_dict(self) -> Dict:
        """Convert hop entry to dictionary for JSON serialization."""
        return {
            "name": self.name,
            "country": self.country,
            "source": self.source,
            "href": self.href,
            "alpha_from": self.alpha_from,
            "alpha_to": self.alpha_to,
            "beta_from": self.beta_from,
            "beta_to": self.beta_to,
            "oil_from": self.oil_from,
            "oil_to": self.oil_to,
            "co_h_from": self.co_h_from,
            "co_h_to": self.co_h_to,
            "notes": self.notes,
            "aromas": self.standardized_aromas,
            "additional_properties": self.additional_properties,
            "brewing_stats": self.get_brewing_stats(),
        }


def save_hop_entries(hop_entries: List[HopEntry], filename: str):
    """Save a list of hop entries to JSON file."""
    # Ensure the directory exists
    output_dir = os.path.dirname(filename)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    data = [entry.to_dict() for entry in hop_entries]
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)
    print(f"Saved {len(hop_entries)} hop entries to {filename}")


def load_hop_entries(filename: str) -> List[Dict]:
    """Load hop entries from JSON file."""
    with open(filename, "r") as f:
        return json.load(f)


def analyze_brewing_parameters(hop_entries: List[HopEntry]) -> Dict:
    """
    Analyze brewing parameters across a collection of hops.

    Args:
        hop_entries: List of HopEntry objects

    Returns:
        Dict containing analysis results and statistics
    """
    if not hop_entries:
        return {}

    stats = {
        "total_hops": len(hop_entries),
        "by_purpose": {"Bittering": 0, "Aroma": 0, "Dual Purpose": 0},
        "alpha_ranges": {"Low": 0, "Medium": 0, "High": 0},
        "oil_ranges": {"Low": 0, "Medium": 0, "High": 0},
        "averages": {"alpha": 0, "beta": 0, "oil": 0, "cohumulone": 0},
    }

    total_alpha = total_beta = total_oil = total_cohumulone = 0
    valid_cohumulone_count = 0

    for hop in hop_entries:
        # Purpose classification
        purpose = hop.get_brewing_purpose()
        stats["by_purpose"][purpose] += 1

        # Alpha classification
        avg_alpha = hop.get_average_alpha()
        alpha_class = hop._classify_alpha(avg_alpha)
        stats["alpha_ranges"][alpha_class] += 1

        # Oil classification
        avg_oil = hop.get_average_oil()
        oil_class = hop._classify_oil(avg_oil)
        stats["oil_ranges"][oil_class] += 1

        # Accumulate for averages
        total_alpha += avg_alpha
        total_beta += hop.get_average_beta()
        total_oil += avg_oil

        avg_cohumulone = hop.get_average_cohumulone()
        if avg_cohumulone > 0:
            total_cohumulone += avg_cohumulone
            valid_cohumulone_count += 1

    # Calculate averages
    stats["averages"]["alpha"] = round(total_alpha / len(hop_entries), 1)
    stats["averages"]["beta"] = round(total_beta / len(hop_entries), 1)
    stats["averages"]["oil"] = round(total_oil / len(hop_entries), 2)
    stats["averages"]["cohumulone"] = (
        round(total_cohumulone / valid_cohumulone_count, 1)
        if valid_cohumulone_count > 0
        else 0
    )

    return stats


def compare_hops_brewing_parameters(hop_entries: List[HopEntry]) -> Dict:
    """
    Generate a comparison report for brewing parameters across selected hops.

    Args:
        hop_entries: List of HopEntry objects to compare

    Returns:
        Dict containing comparison data suitable for visualization
    """
    if not hop_entries:
        return {}

    comparison = {"hops": [], "normalized_data": [], "recommendations": []}

    for hop in hop_entries:
        hop_data = {
            "name": hop.name,
            "source": hop.source,
            "brewing_purpose": hop.get_brewing_purpose(),
            "parameters": {
                "alpha": hop.get_average_alpha(),
                "beta": hop.get_average_beta(),
                "oil": hop.get_average_oil(),
                "cohumulone": hop.get_average_cohumulone(),
            },
        }
        comparison["hops"].append(hop_data)

        # Normalized data for radar charts (0-10 scale)
        normalized = {
            "name": hop.name,
            "alpha_normalized": min((hop.get_average_alpha() / 20) * 10, 10),
            "beta_normalized": min((hop.get_average_beta() / 10) * 10, 10),
            "oil_normalized": min((hop.get_average_oil() / 4) * 10, 10),
            "cohumulone_normalized": min((hop.get_average_cohumulone() / 50) * 10, 10),
        }
        comparison["normalized_data"].append(normalized)

    # Generate recommendations
    purposes = [hop.get_brewing_purpose() for hop in hop_entries]
    if all(p == "Bittering" for p in purposes):
        comparison["recommendations"].append(
            "All selected hops are primarily bittering hops - great for early boil additions"
        )
    elif all(p == "Aroma" for p in purposes):
        comparison["recommendations"].append(
            "All selected hops are aroma hops - ideal for late boil, whirlpool, or dry hop additions"
        )
    else:
        comparison["recommendations"].append(
            "Mix of hop purposes - consider using bittering hops early and aroma hops late in the boil"
        )

    return comparison
