"""
HopDatabase - A comprehensive database and scraping system for hop varieties

This package provides tools for scraping hop data from various suppliers
and maintaining a standardized database of hop varieties with their characteristics.
"""

__version__ = "1.0.0"
__author__ = "HopDatabase Contributors"

from .models.hop_model import HopEntry, save_hop_entries, load_hop_entries
from .scrapers import yakima_chief, barth_haas, hopsteiner

__all__ = [
    "HopEntry",
    "save_hop_entries", 
    "load_hop_entries",
    "yakima_chief",
    "barth_haas", 
    "hopsteiner"
]
