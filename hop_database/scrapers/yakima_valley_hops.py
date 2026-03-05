"""
Yakima Valley Hops Scraper

Scrapes hop data from https://yakimavalleyhops.com/collections/all-hops
Uses the Shopify storefront JSON API for reliable data extraction.
This source provides brewing values (alpha, beta, cohumulone, oil) without sensory analysis.
"""

import re
from typing import List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

from ..models.hop_model import HopEntry, save_hop_entries

BASE_URL = "https://yakimavalleyhops.com"
PRODUCTS_API_URL = "https://yakimavalleyhops.com/collections/all-hops/products.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# Tags used by Yakima Valley Hops to indicate country of origin
COUNTRY_TAG_MAP = {
    "german": "Germany",
    "germany": "Germany",
    "czech": "Czech Republic",
    "new zealand": "New Zealand",
    "nz": "New Zealand",
    "australia": "Australia",
    "australian": "Australia",
    "uk": "United Kingdom",
    "united kingdom": "United Kingdom",
    "english": "United Kingdom",
    "slovenian": "Slovenia",
    "slovenia": "Slovenia",
    "polish": "Poland",
    "poland": "Poland",
    "french": "France",
    "france": "France",
    "usa": "USA",
    "american": "USA",
    "us": "USA",
}


def parse_range(text: str) -> Tuple[str, str]:
    """Parses a numeric range string like '5.5 - 8.5' or '< 10' into (from, to) values."""
    if not text:
        return "", ""
    text = text.strip()
    # Handle ranges like "5.5 - 8.5" or "5.5-8.5"
    match = re.search(r"([\d.]+)\s*[-–]\s*([\d.]+)", text)
    if match:
        return match.group(1), match.group(2)
    # Handle single values like "~5.5" or "5.5%"
    single = re.search(r"([\d.]+)", text)
    if single:
        val = single.group(1)
        return val, val
    return "", ""


def extract_country(product: dict) -> str:
    """Determines country of origin from product tags or title."""
    tags = [t.lower() for t in product.get("tags", [])]
    title = product.get("title", "").lower()

    # Check tags first
    for tag in tags:
        for keyword, country in COUNTRY_TAG_MAP.items():
            if keyword == tag:
                return country

    # Check title for country indicators
    for keyword, country in COUNTRY_TAG_MAP.items():
        if keyword in title:
            return country

    # Default to USA for Yakima Valley Hops (primarily US supplier)
    return "USA"


def extract_brewing_values(body_html: str) -> dict:
    """
    Extracts brewing values from the product's HTML description.

    Yakima Valley Hops product descriptions typically contain tables or
    paragraphs with brewing statistics like alpha, beta, cohumulone, and oil.
    """
    if not body_html:
        return {}

    soup = BeautifulSoup(body_html, "html.parser")
    plain_text = soup.get_text(" ", strip=True)
    brewing_data = {}

    # Try to extract from table cells (common pattern)
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                key = cells[0].get_text(strip=True).lower().strip(":").strip()
                value = cells[1].get_text(strip=True)
                brewing_data[key] = value

    # Try to extract from definition lists
    for dl in soup.find_all("dl"):
        for dt, dd in zip(dl.find_all("dt"), dl.find_all("dd")):
            key = dt.get_text(strip=True).lower().strip(":").strip()
            value = dd.get_text(strip=True)
            brewing_data[key] = value

    # Pattern matching on plain text for key:value pairs
    patterns = [
        (r"(?i)alpha\s*(?:acid[s]?)?\s*[:\-]\s*([\d.]+\s*[-–]\s*[\d.]+\s*%?)", "alpha"),
        (r"(?i)beta\s*(?:acid[s]?)?\s*[:\-]\s*([\d.]+\s*[-–]\s*[\d.]+\s*%?)", "beta"),
        (r"(?i)co-?h(?:umulone)?\s*[:\-]\s*([\d.]+\s*[-–]\s*[\d.]+\s*%?)", "cohumulone"),
        (r"(?i)total\s*oil\s*[:\-]\s*([\d.]+\s*[-–]\s*[\d.]+\s*(?:ml/100g)?)", "oil"),
        (r"(?i)oil\s*(?:content)?\s*[:\-]\s*([\d.]+\s*[-–]\s*[\d.]+\s*(?:ml/100g)?)", "oil"),
    ]
    for pattern, key in patterns:
        if key not in brewing_data:
            m = re.search(pattern, plain_text)
            if m:
                brewing_data[key] = m.group(1).strip()

    return brewing_data


def extract_notes(body_html: str) -> List[str]:
    """Extracts aroma/flavor notes from the product description HTML."""
    if not body_html:
        return []

    soup = BeautifulSoup(body_html, "html.parser")

    # Look for aroma/flavor descriptors in specific sections
    notes = []
    for elem in soup.find_all(["p", "li", "div", "span"]):
        text = elem.get_text(strip=True)
        lower_text = text.lower()
        if any(kw in lower_text for kw in ["aroma", "flavor", "flavour", "aroma profile"]):
            # Remove the label prefix and split by commas/semicolons
            cleaned = re.sub(r"(?i)(aroma|flavor|flavour)\s*(profile)?\s*[:\-]?\s*", "", text)
            candidates = [n.strip() for n in re.split(r"[,;]", cleaned) if n.strip()]
            if candidates and len(candidates) >= 1:
                notes = candidates
                break

    return notes


def process_product(product: dict) -> Optional[HopEntry]:
    """Converts a Shopify product JSON object into a HopEntry."""
    try:
        title = product.get("title", "").strip()
        if not title:
            return None

        handle = product.get("handle", "")
        hop_url = f"{BASE_URL}/products/{handle}" if handle else BASE_URL

        # Extract country of origin
        country = extract_country(product)

        # Extract brewing values from body_html
        body_html = product.get("body_html", "")
        brewing_data = extract_brewing_values(body_html)

        # Parse ranges for each brewing parameter
        alpha_from, alpha_to = parse_range(
            brewing_data.get("alpha", brewing_data.get("alpha acids", ""))
        )
        beta_from, beta_to = parse_range(
            brewing_data.get("beta", brewing_data.get("beta acids", ""))
        )
        co_h_from, co_h_to = parse_range(
            brewing_data.get("cohumulone", brewing_data.get("co-h", ""))
        )
        oil_from, oil_to = parse_range(
            brewing_data.get("oil", brewing_data.get("total oil", ""))
        )

        # Extract notes
        notes = extract_notes(body_html)

        # Skip entries with no meaningful brewing data
        if not alpha_from and not alpha_to and not beta_from and not beta_to:
            return None

        hop_entry = HopEntry(
            name=title,
            country=country,
            source="Yakima Valley Hops",
            href=hop_url,
            alpha_from=alpha_from,
            alpha_to=alpha_to,
            beta_from=beta_from,
            beta_to=beta_to,
            oil_from=oil_from,
            oil_to=oil_to,
            co_h_from=co_h_from,
            co_h_to=co_h_to,
            notes=notes,
        )

        return hop_entry

    except Exception as e:
        print(f"  Error processing product '{product.get('title', 'unknown')}': {e}")
        return None


def get_all_products() -> List[dict]:
    """
    Fetches all hop products from the Shopify storefront JSON API.
    Handles pagination automatically.
    """
    all_products = []
    page = 1
    limit = 250  # Shopify maximum per page

    while True:
        url = f"{PRODUCTS_API_URL}?limit={limit}&page={page}"
        try:
            response = requests.get(url, headers=HEADERS, timeout=20)
            response.raise_for_status()
            data = response.json()
            products = data.get("products", [])
            if not products:
                break
            all_products.extend(products)
            print(f"  Fetched page {page}: {len(products)} products (total so far: {len(all_products)})")
            if len(products) < limit:
                break
            page += 1
        except requests.exceptions.RequestException as e:
            print(f"  Error fetching Yakima Valley Hops products (page {page}): {e}")
            break

    return all_products


def scrape(save: bool = False) -> List[HopEntry]:
    """Main function to scrape all hops from Yakima Valley Hops."""
    print("Fetching products from Yakima Valley Hops API...")
    products = get_all_products()

    if not products:
        print("No products found for Yakima Valley Hops.")
        return []

    print(f"Processing {len(products)} products...")
    hop_entries = []
    for product in products:
        entry = process_product(product)
        if entry:
            hop_entries.append(entry)
            print(f"  Processed: {entry.name} (alpha: {entry.alpha_from}-{entry.alpha_to}%)")

    print(f"\nYakima Valley Hops: successfully scraped {len(hop_entries)} of {len(products)} products.")

    if save:
        save_hop_entries(hop_entries, "data/yakimavalleyhops.json")

    return hop_entries


def main():
    scrape(save=True)


if __name__ == "__main__":
    main()
