"""
Hop Data Model

This module defines the standard data structure for hop entries and provides
utilities for creating, validating, and normalizing hop data across all sources.

Standard Aroma Categories:
- Citrus
- Resin/Pine
- Spice
- Herbal
- Grassy
- Floral
- Berry
- Stone Fruit
- Tropical Fruit
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
    "Tropical Fruit"
]

# Mapping from source-specific categories to standard categories
AROMA_MAPPINGS = {
    # Yakima Chief Hops mappings
    "yakima": {
        "Sweet Aromatic": "Floral",
        "Berry": "Berry",
        "Stone fruit": "Stone Fruit",
        "Pomme": "Stone Fruit",  # Apple-like fruits
        "Melon": "Tropical Fruit",
        "Tropical": "Tropical Fruit",
        "Citrus": "Citrus",
        "Floral": "Floral",
        "Herbal": "Herbal",
        "Vegetal": "Grassy",
        "Grassy": "Grassy",
        "Earthy": "Herbal",  # Earthy often overlaps with herbal
        "Woody": "Resin/Pine",
        "Spicy": "Spice"
    },
    
    # Barth Haas mappings
    "barth": {
        "Citrus": "Citrus",
        "Sweetfruits": "Stone Fruit",
        "Greenfruits": "Stone Fruit", 
        "Redberries": "Berry",
        "Creamcaramel": "Floral",  # Sweet aromatics
        "Woody": "Resin/Pine",
        "Menthol": "Herbal",
        "Herbaceous": "Herbal",
        "Spicy": "Spice",
        "Green": "Grassy",
        "Vegetal": "Grassy",
        "Flowery": "Floral"
    },
    
    # Hopsteiner mappings
    "hopsteiner": {
        "Fruity": "Stone Fruit",  # General fruit category
        "Floral": "Floral",
        "citrusy": "Citrus",
        "Spicy": "Spice",
        "Herbal": "Herbal",
        "Tropical": "Tropical Fruit",
        "Berry": "Berry",
        "Woody": "Resin/Pine",
        "Grassy": "Grassy",
        "Resinous": "Resin/Pine",
        "Pine": "Resin/Pine"
    }
}

# Additional mappings for text-based notes
TEXT_MAPPINGS = {
    # Citrus terms
    "lemon": "Citrus",
    "lime": "Citrus", 
    "orange": "Citrus",
    "grapefruit": "Citrus",
    "citrus": "Citrus",
    "citrusy": "Citrus",
    
    # Berry terms
    "berry": "Berry",
    "strawberry": "Berry",
    "blackberry": "Berry",
    "raspberry": "Berry",
    "cranberry": "Berry",
    "blueberry": "Berry",
    "redberries": "Berry",
    
    # Stone fruit terms
    "peach": "Stone Fruit",
    "apricot": "Stone Fruit",
    "plum": "Stone Fruit",
    "apple": "Stone Fruit",
    "pear": "Stone Fruit",
    "stone fruit": "Stone Fruit",
    
    # Tropical fruit terms
    "mango": "Tropical Fruit",
    "pineapple": "Tropical Fruit",
    "passion fruit": "Tropical Fruit",
    "papaya": "Tropical Fruit",
    "guava": "Tropical Fruit",
    "coconut": "Tropical Fruit",
    "melon": "Tropical Fruit",
    "tropical": "Tropical Fruit",
    
    # Floral terms
    "floral": "Floral",
    "flowery": "Floral",
    "rose": "Floral",
    "lavender": "Floral",
    "jasmine": "Floral",
    "sweet": "Floral",
    
    # Herbal terms
    "herbal": "Herbal",
    "herbaceous": "Herbal",
    "mint": "Herbal",
    "sage": "Herbal",
    "thyme": "Herbal",
    "basil": "Herbal",
    "tea": "Herbal",
    "earthy": "Herbal",
    
    # Grassy terms
    "grassy": "Grassy",
    "green": "Grassy",
    "vegetal": "Grassy",
    "hay": "Grassy",
    "fresh": "Grassy",
    
    # Spice terms
    "spice": "Spice",
    "spicy": "Spice",
    "pepper": "Spice",
    "cinnamon": "Spice",
    "clove": "Spice",
    "nutmeg": "Spice",
    "allspice": "Spice",
    
    # Resin/Pine terms
    "pine": "Resin/Pine",
    "resin": "Resin/Pine",
    "resinous": "Resin/Pine",
    "woody": "Resin/Pine",
    "cedar": "Resin/Pine",
    "fir": "Resin/Pine",
    "dank": "Resin/Pine"
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
    additional_properties: Dict[str, Union[str, float, int]] = field(default_factory=dict)
    
    def __post_init__(self):
        """Initialize standardized aromas with default values if not provided."""
        if not self.standardized_aromas:
            self.standardized_aromas = {aroma: 0 for aroma in STANDARD_AROMAS}
    
    def set_standardized_aromas(self, source_name: str, source_aroma_data: Optional[Dict] = None):
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
                    current_intensity = int(intensity) if isinstance(intensity, (int, float)) else 0
                    self.standardized_aromas[standard_aroma] = max(
                        self.standardized_aromas[standard_aroma], 
                        current_intensity
                    )
        
        # # Process text-based notes
        # if self.notes:
        #     for note in self.notes:
        #         note_lower = note.lower().strip()
        #         # Check for direct matches in text mappings
        #         for text_term, standard_aroma in TEXT_MAPPINGS.items():
        #             if text_term in note_lower:
        #                 # Give text-based matches a moderate intensity (2) if not already set higher
        #                 if self.standardized_aromas[standard_aroma] == 0:
        #                     self.standardized_aromas[standard_aroma] = 2
    
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
            "additional_properties": self.additional_properties
        }


def save_hop_entries(hop_entries: List[HopEntry], filename: str):
    """Save a list of hop entries to JSON file."""
    data = [entry.to_dict() for entry in hop_entries]
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Saved {len(hop_entries)} hop entries to {filename}")


def load_hop_entries(filename: str) -> List[Dict]:
    """Load hop entries from JSON file."""
    with open(filename, 'r') as f:
        return json.load(f)
