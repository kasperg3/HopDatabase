# your_project_folder/scrapers/crosby_hops.py

import requests
from bs4 import BeautifulSoup
import json
import re
import concurrent.futures
from typing import List, Optional, Tuple

# Assumes hop_model is in a sibling 'models' directory
from ..models.hop_model import HopEntry, save_hop_entries

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def parse_range(text: str) -> tuple[str, str]:
    """Parses a string like '14 - 16 %' into from/to values."""
    if not text: return "", ""
    text = text.lower()
    if '-' in text:
        parts = [p.strip() for p in text.split('-')]
        return parts[0], re.sub(r'[^0-9.]', '', parts[1])
    if '<' in text:
        return "", re.sub(r'[^0-9.]', '', text)
    if '>' in text:
        return re.sub(r'[^0-9.]', '', text), ""
    val = re.sub(r'[^0-9.]', '', text)
    return val, ""

def process_name_and_country(name: str) -> Tuple[str, str]:
    """
    Determines the country of origin based on tags in the hop name
    and returns a cleaned name and the country.
    """
    # Default origin for Crosby Hops
    country = "USA"
    cleaned_name = name

    if name.startswith("GR "):
        country = "Germany"
        cleaned_name = name[3:]
    elif "Hop Revolution" in name or name.startswith("NZ "):
        country = "New Zealand"
        # Remove tags and extra whitespace
        cleaned_name = name.replace("Hop Revolution", "").replace("NZ ", "").strip()
    elif name.startswith("CZ "):
        country = "Czech Republic"
        cleaned_name = name[3:]

    # Remove any lingering parenthetical tags, e.g., (US)
    cleaned_name = re.sub(r'\s*\(\w+\)$', '', cleaned_name)
    
    return cleaned_name.strip(), country


def get_hop_links(catalog_url):
    """
    Scrapes the main catalog page to find the URLs for all individual hop pages.
    """
    print("Fetching hop links from the main catalog...")
    try:
        # Use the header in the request
        response = requests.get(catalog_url, headers=HEADERS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        link_tags = soup.find_all('a', class_='result-item')
        hop_links = set()
        for link_tag in link_tags:
            href = link_tag.get('href')
            if href and 'hop-catalog' in href:
                hop_links.add(href)
        print(f"Found {len(hop_links)} unique hop links.")
        return list(hop_links)

    except requests.exceptions.RequestException as e:
        print(f"Error fetching catalog URL: {e}")
        return []


def process_hop_page(hop_url: str) -> Optional[HopEntry]:
    """Fetches and processes a single hop page, returning a HopEntry object."""
    try:
        response = requests.get(hop_url, headers=HEADERS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # --- Scrape Raw Data ---
        raw_data = {}
        name_tag = soup.find('h1')
        original_name = name_tag.get_text(strip=True) if name_tag else "Unknown"
        if name_tag and name_tag.sup:
            name_tag.sup.decompose()
            original_name = name_tag.get_text(strip=True)

        # Process name for origin tags and cleanup
        cleaned_name, country = process_name_and_country(original_name)
        raw_data['name'] = cleaned_name
        raw_data['country'] = country

        # Scrape text notes
        aroma_profile_tag = soup.find('div', class_='p-aroma-profile')
        if aroma_profile_tag and aroma_profile_tag.find('p'):
            raw_data['notes'] = [note.strip() for note in aroma_profile_tag.p.get_text(strip=True).split(',')]

        # Scrape brewing values
        brewing_values_tab = soup.find('div', id='tab-1')
        if brewing_values_tab:
            for p_tag in brewing_values_tab.find_all('p'):
                spans = p_tag.find_all('span')
                if len(spans) == 2:
                    key = spans[0].get_text(strip=True).lower()
                    raw_data[key.replace(' ', '_')] = spans[1].get_text(strip=True)

        # Scrape structured aroma data
        raw_aroma_data = {}
        canvas = soup.find('canvas', id='radar-chart')
        if canvas and 'data-aroma-labels' in canvas.attrs and 'data-rv' in canvas.attrs:
            labels = json.loads(canvas['data-aroma-labels'])
            values = json.loads(canvas['data-rv'])
            raw_aroma_data = {label: int(val) for label, val in zip(labels, values)}
        
        # --- Create and Populate HopEntry ---
        hop_entry = HopEntry(
            name=raw_data.get('name', 'Unknown'),
            country=raw_data.get('country', 'USA'),
            source="Crosby Hops",
            href=hop_url,
            alpha_from=parse_range(raw_data.get('alpha', ''))[0],
            alpha_to=parse_range(raw_data.get('alpha', ''))[1],
            beta_from=parse_range(raw_data.get('beta', ''))[0],
            beta_to=parse_range(raw_data.get('beta', ''))[1],
            oil_from=parse_range(raw_data.get('total_oil', ''))[0],
            oil_to=parse_range(raw_data.get('total_oil', ''))[1],
            co_h_from=parse_range(raw_data.get('cohumulone', ''))[0],
            co_h_to=parse_range(raw_data.get('cohumulone', ''))[1],
            notes=raw_data.get('notes', []),
            additional_properties={'storage': raw_data.get('storage', 'N/A')}
        )

        # Standardize aromas using the model's method
        hop_entry.set_standardized_aromas("crosby", raw_aroma_data)
        
        print(f"Successfully processed: {hop_entry.name} ({hop_entry.country})")
        return hop_entry

    except Exception as e:
        print(f"--- Error processing {hop_url}: {e} ---")
        return None

def scrape(save=False):
    """Main function to orchestrate the scraping process."""
    base_url = "https://www.crosbyhops.com/shop-hops/hop-catalog/"
    hop_links = get_hop_links(base_url)
    
    if not hop_links:
        print("No hop links found. Exiting.")
        return []

    hop_entries = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_hop = {executor.submit(process_hop_page, link): link for link in hop_links}
        for future in concurrent.futures.as_completed(future_to_hop):
            result = future.result()
            if result:
                hop_entries.append(result)

    print(f"\nSuccessfully scraped {len(hop_entries)} of {len(hop_links)} hops.")

    if save:
        output_file = "data/crosbyhops.json"
        save_hop_entries(hop_entries, output_file)

    return hop_entries
