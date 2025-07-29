#!/usr/bin/env python3
"""
Main scraper script for HopDatabase

This script runs all hop scrapers and combines the data into a single JSON file.
"""

import os

from hop_database.scrapers import yakima_chief, barth_haas, hopsteiner
from hop_database.models.hop_model import save_hop_entries


def main():
    """Run all scrapers and combine the data."""
    print("Starting hop data scraping...")
    
    # Run all scrapers
    print("Scraping Yakima Chief Hops...")
    ych = yakima_chief.scrape()
    print(f"Found {len(ych)} hops from Yakima Chief")
    
    print("Scraping Barth Haas...")
    bh = barth_haas.scrape()
    print(f"Found {len(bh)} hops from Barth Haas")
    
    print("Scraping Hopsteiner...")
    hs = hopsteiner.scrape()
    print(f"Found {len(hs)} hops from Hopsteiner")
    
    # Combine all entries
    combined_hop_entries = ych + bh + hs
    print(f"Total hop entries: {len(combined_hop_entries)}")
    
    # Create data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # Save to JSON file
    output_path = os.path.join(data_dir, 'hops.json')
    
    combined_hop_entries.sort(key=lambda hop: hop.name)
    save_hop_entries(combined_hop_entries, output_path)
    
    print(f"Data saved to {output_path}")
    
    # Also save to website data directory
    website_data_path = os.path.join(os.path.dirname(__file__), 'website', 'public', 'data', 'hops.json')
    if os.path.exists(os.path.dirname(website_data_path)):
        save_hop_entries(combined_hop_entries, website_data_path)
        print(f"Data also saved to {website_data_path}")


if __name__ == "__main__":
    main()
