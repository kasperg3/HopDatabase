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
from hop_database.scrapers import yakima_chief, barth_haas, hopsteiner


def normalize_hop_name(name):
    """Normalizes hop names for consistent grouping."""
    name = name.lower()
    name = re.sub(r'[®™\'()]', '', name)
    name = re.sub(r'brand', '', name)
    name = re.sub(r'\s*-\s*\w{2,3}$', '', name)
    return name.strip()

def get_safe_float(value, default=0.0):
    """Safely converts a value to a float."""
    if value is None or value == '': return default
    try: return float(value)
    except (ValueError, TypeError): return default

def merge_hops(hops_data: List[HopEntry]) -> List[HopEntry]:
    """Merges a list of HopEntry objects into a standardized list."""
    grouped_hops = defaultdict(list)
    for hop in hops_data:
        normalized_name = normalize_hop_name(hop.name)
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

            # CORRECTED: Directly use the already standardized aromas from the scraper's HopEntry object.
            # The scrapers are responsible for calling set_standardized_aromas correctly.
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
            setattr(final_hop, f"{key}_from", min(values['from']) if values['from'] else 0.0)
            setattr(final_hop, f"{key}_to", max(values['to']) if values['to'] else 0.0)

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
                final_hop.standardized_aromas[aroma] = data['sum'] / data['count']

        for base_key, values in additional_props_values.items():
            final_hop.additional_properties[f"{base_key}_from"] = min(values['from']) if values['from'] else 0.0
            final_hop.additional_properties[f"{base_key}_to"] = max(values['to']) if values['to'] else 0.0

        merged_hops.append(final_hop)

    return merged_hops

def main():
    """Run all scrapers, combine the data, and then merge it."""
    print("Starting hop data scraping...")
    
    # Run all scrapers
    print("Scraping Yakima Chief Hops...")
    ych = yakima_chief.scrape(save=False)
    print(f"Found {len(ych)} hops from Yakima Chief")
    
    ych_eu = yakima_chief.scrape("https://www.yakimachief.eu/commercial/hop-varieties.html?product_list_limit=all", save=False)
    print(f"Found {len(ych_eu)} hops from Yakima Chief EU")
    
    ych_us_names = {hop.name for hop in ych}
    ych_combined = ych + [hop for hop in ych_eu if hop.name not in ych_us_names]
    
    print("Scraping Barth Haas...")
    bh = barth_haas.scrape(save=False)
    print(f"Found {len(bh)} hops from Barth Haas")
    
    print("Scraping Hopsteiner...")
    hs = hopsteiner.scrape(save=False)
    print(f"Found {len(hs)} hops from Hopsteiner")
    
    # Combine all entries
    combined_hop_entries = ych_combined + bh + hs
    print(f"Total raw hop entries: {len(combined_hop_entries)}")
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # # Save the raw, combined data
    # raw_output_path = os.path.join(data_dir, 'hops.json')
    # combined_hop_entries.sort(key=lambda hop: hop.name)
    # save_hop_entries(combined_hop_entries, raw_output_path)
    # print(f"Raw data saved to {raw_output_path}")

    # --- Run the merger on the combined data ---
    print("\nStarting hop data merging...")
    merged_data = merge_hops(combined_hop_entries)
    
    # # Save the merged data
    # merged_output_path = os.path.join(data_dir, 'merged_hops.json')
    # merged_data.sort(key=lambda hop: hop.name)
    # save_hop_entries(merged_data, merged_output_path)
    # print(f"Merged data saved to {merged_output_path}")

    # Optionally, save to a website data directory as well
    website_data_path = os.path.join(os.path.dirname(__file__), 'website', 'public', 'data', 'hops.json')
    if os.path.exists(os.path.dirname(website_data_path)):
        save_hop_entries(merged_data, website_data_path)
        print(f"Merged data also saved to {website_data_path}")

if __name__ == "__main__":
    main()
