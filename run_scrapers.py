#!/usr/bin/env python3
"""
Main scraper and merger script for HopDatabase

This script runs all hop scrapers, combines the raw data into 'hops.json',
and then merges the data into a standardized 'merged_hops.json' file.
"""

import os
import json
import re
from collections import defaultdict
from typing import Dict, List, Optional, Union

# Import the data model and scrapers
from hop_database.models.hop_model import HopEntry, save_hop_entries
from hop_database.scrapers import yakima_chief, barth_haas, hopsteiner, crosby_hops


def normalize_hop_name(name):
    """Normalizes hop names for consistent grouping."""
    name = name.lower()
    # Remove both unicode and literal "®Brand" patterns
    name = re.sub(r'(\\u00aeBrand|®Brand)', '', name)
    name = re.sub(r'\(.*?\)', '', name)
    name = re.sub(r'[®™\'()]', '', name)
    name = re.sub(r'brand', '', name)
    name = re.sub(r'\s*-\s*\w{2,3}$', '', name)
    return name.strip()

def get_safe_float(value, default=0.0):
    """Safely converts a value to a float."""
    if value is None or value == '': return default
    try: return float(value)
    except (ValueError, TypeError): return default

# Add a mapping for known equivalent hop names
MERGE_NAME_ALIASES = {
    "hallertauer mittelfrüher": "hallertauer mittelfrüh",
    "hallertauer mittelfrueh": "hallertauer mittelfrüh",
    "hallertau mittelfrüh": "hallertauer mittelfrüh",
    "East kent goldings" : "East kent golding",
    "Fuggle" : "Fuggles"
    # Add more aliases as needed
}

def scale_aroma_values_by_source(hops_data: List[HopEntry]) -> List[HopEntry]:
    """
    Scale aroma values to 0-5 range based on the maximum value found for each source.
    This ensures each producer's data is properly normalized relative to their own scale.
    """
    # Group hops by source to analyze their aroma ranges
    source_max_values = defaultdict(lambda: defaultdict(float))
    
    # First pass: find the maximum aroma value for each source and aroma category
    for hop in hops_data:
        if hop.source and isinstance(hop.standardized_aromas, dict):
            for aroma_category, value in hop.standardized_aromas.items():
                if isinstance(value, (int, float)) and value > 0:
                    current_max = source_max_values[hop.source][aroma_category]
                    source_max_values[hop.source][aroma_category] = max(current_max, float(value))
    
    # Calculate overall max for each source (across all aroma categories)
    source_overall_max = {}
    for source, aroma_maxes in source_max_values.items():
        if aroma_maxes:
            source_overall_max[source] = max(aroma_maxes.values())
        else:
            source_overall_max[source] = 1.0  # Default to prevent division by zero
    
    print("\nAroma scaling analysis by source:")
    for source, max_val in source_overall_max.items():
        print(f"  {source}: max aroma value = {max_val}")
    
    # Track which sources need scaling to avoid duplicate messages
    scaled_sources = set()
    
    # Second pass: scale the aroma values
    for hop in hops_data:
        if hop.source and isinstance(hop.standardized_aromas, dict):
            overall_max = source_overall_max.get(hop.source, 1.0)
            
            # Only scale if the max value is greater than 5
            if overall_max > 5:
                scale_factor = 5.0 / overall_max
                
                # Print scaling message only once per source
                if hop.source not in scaled_sources:
                    print(f"  Scaling {hop.source} by factor {scale_factor:.3f}")
                    scaled_sources.add(hop.source)
                
                for aroma_category in hop.standardized_aromas:
                    original_value = hop.standardized_aromas[aroma_category]
                    if isinstance(original_value, (int, float)) and original_value > 0:
                        scaled_value = original_value * scale_factor
                        # Round to 1 decimal place and ensure it's within 0-5
                        hop.standardized_aromas[aroma_category] = min(5.0, max(0.0, round(scaled_value, 1)))
            else:
                # Even if no scaling needed, ensure values are clamped to 0-5 and rounded
                for aroma_category in hop.standardized_aromas:
                    original_value = hop.standardized_aromas[aroma_category]
                    if isinstance(original_value, (int, float)):
                        hop.standardized_aromas[aroma_category] = min(5.0, max(0.0, round(float(original_value), 1)))
    
    return hops_data

def merge_hops(hops_data: List[HopEntry]) -> List[HopEntry]:
    """Merges a list of HopEntry objects into a standardized list."""
    grouped_hops = defaultdict(list)
    for hop in hops_data:
        normalized_name = normalize_hop_name(hop.name)
        # Use alias mapping if available
        normalized_name = MERGE_NAME_ALIASES.get(normalized_name, normalized_name)
        if normalized_name:
            grouped_hops[normalized_name].append(hop)

    merged_hops = []
    for name, entries in grouped_hops.items():
        if not entries: continue

        final_hop = HopEntry(name=name.capitalize())
        
        all_notes = set()
        all_countries = []
        all_sources = set()
        all_hrefs = []
        all_standardized_aromas = []
        
        range_values = defaultdict(lambda: {'from': [], 'to': []})
        additional_props_values = defaultdict(lambda: {'from': [], 'to': []})

        for hop in entries:
            all_notes.update([note.strip().lower() for note in hop.notes if note])
            if hop.country: all_countries.append(hop.country)
            if hop.source: all_sources.add(hop.source)
            if hop.href: all_hrefs.append(hop.href)

            if isinstance(hop.standardized_aromas, dict):
                all_standardized_aromas.append(hop.standardized_aromas)

            for key in ["alpha", "beta", "oil", "co_h"]:
                range_values[key]['from'].append(get_safe_float(getattr(hop, f"{key}_from")))
                range_values[key]['to'].append(get_safe_float(getattr(hop, f"{key}_to")))

            for prop_key, prop_val in hop.additional_properties.items():
                if prop_key.endswith("_from"):
                    base_key = prop_key[:-5]
                    additional_props_values[base_key]['from'].append(get_safe_float(prop_val))
                elif prop_key.endswith("_to"):
                    base_key = prop_key[:-3]
                    additional_props_values[base_key]['to'].append(get_safe_float(prop_val))

        final_hop.notes = sorted(list(all_notes))
        final_hop.country = all_countries[0] if all_countries else ""
        final_hop.source = " / ".join(sorted(list(all_sources)))
        final_hop.href = all_hrefs[0] if all_hrefs else ""

        for key, values in range_values.items():
            from_vals = [v for v in values['from'] if v > 0]
            to_vals = [v for v in values['to'] if v > 0]
            setattr(final_hop, f"{key}_from", min(from_vals) if from_vals else 0.0)
            setattr(final_hop, f"{key}_to", max(to_vals) if to_vals else 0.0)

        aroma_aggregator = defaultdict(lambda: {'sum': 0, 'count': 0})
        for aroma_dict in all_standardized_aromas:
            for aroma, value in aroma_dict.items():
                if value > 0:
                    aroma_aggregator[aroma]['sum'] += value
                    aroma_aggregator[aroma]['count'] += 1
        
        # Re-initialize aromas in final_hop before populating
        final_hop.standardized_aromas = {aroma: 0 for aroma in final_hop.standardized_aromas}
        for aroma, data in aroma_aggregator.items():
            if data['count'] > 0:
                final_hop.standardized_aromas[aroma] = round(data['sum'] / data['count'], 2)

        for base_key, values in additional_props_values.items():
            from_vals = [v for v in values['from'] if v > 0]
            to_vals = [v for v in values['to'] if v > 0]
            final_hop.additional_properties[f"{base_key}_from"] = min(from_vals) if from_vals else 0.0
            final_hop.additional_properties[f"{base_key}_to"] = max(to_vals) if to_vals else 0.0

        merged_hops.append(final_hop)

    return merged_hops

def main():
    """Run all scrapers, combine the data, and then merge it."""
    print("Starting hop data scraping...")
    
    # --- Run all scrapers ---
    print("\nScraping Yakima Chief Hops...")
    ych = yakima_chief.scrape(save=False)
    print(f"Found {len(ych)} hops from Yakima Chief")
    
    ych_eu = yakima_chief.scrape(url="https://www.yakimachief.eu/commercial/hop-varieties.html?product_list_limit=all", save=False)
    print(f"Found {len(ych_eu)} hops from Yakima Chief EU")
    
    ych_us_names = {hop.name for hop in ych}
    ych_combined = ych + [hop for hop in ych_eu if hop.name not in ych_us_names]
    
    print("\nScraping Barth Haas...")
    bh = barth_haas.scrape(save=False)
    print(f"Found {len(bh)} hops from Barth Haas")
    
    print("\nScraping Hopsteiner...")
    hs = hopsteiner.scrape(save=False)
    print(f"Found {len(hs)} hops from Hopsteiner")
    
    # ADDED: Run Crosby Hops scraper
    print("\nScraping Crosby Hops...")
    crosby = crosby_hops.scrape(save=False)
    print(f"Found {len(crosby)} hops from Crosby Hops")
    
    # --- Combine all entries ---
    combined_hop_entries = ych_combined + bh + hs + crosby
    print(f"\nTotal raw hop entries: {len(combined_hop_entries)}")
    
    # --- Scale aroma values by source before merging ---
    print("\nScaling aroma values by source...")
    scaled_hop_entries = scale_aroma_values_by_source(combined_hop_entries)
    
    # --- Run the merger on the scaled data ---
    print("\nStarting hop data merging...")
    merged_data = merge_hops(scaled_hop_entries)
    print(f"Total merged hop entries: {len(merged_data)}")
    
    # Sort final data by name
    merged_data.sort(key=lambda hop: hop.name)

    
    # Optionally, save to a website data directory as well
    website_data_path = os.path.join(os.path.dirname(__file__), 'website', 'public', 'data', 'hops.json')
    if os.path.exists(os.path.dirname(website_data_path)):
        save_hop_entries(merged_data, website_data_path)
        print(f"Merged data also saved to {website_data_path}")

if __name__ == "__main__":
    main()