import re
import concurrent.futures
from typing import Optional, Tuple, List

import requests
from bs4 import BeautifulSoup

from ..models.hop_model import HopEntry, save_hop_entries

BASE_URL = "https://yakimavalleyhops.com"
PRODUCTS_API_URL = f"{BASE_URL}/collections/all-hops/products.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
}

# Tags used by YVH to indicate origin country
COUNTRY_TAG_MAP = {
    "usa": "USA",
    "us hops": "USA",
    "american": "USA",
    "germany": "Germany",
    "german": "Germany",
    "new zealand": "New Zealand",
    "nz": "New Zealand",
    "czech": "Czech Republic",
    "australia": "Australia",
    "australian": "Australia",
    "uk": "United Kingdom",
    "english": "United Kingdom",
    "england": "United Kingdom",
    "slovenia": "Slovenia",
    "polish": "Poland",
    "poland": "Poland",
    "japan": "Japan",
    "japanese": "Japan",
    "canada": "Canada",
    "canadian": "Canada",
    "south africa": "South Africa",
}


def get_all_hop_products() -> List[dict]:
    """Fetch all hop products from the Shopify JSON API with pagination."""
    products = []
    page = 1
    limit = 250

    while True:
        url = f"{PRODUCTS_API_URL}?limit={limit}&page={page}"
        try:
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            data = response.json()
            batch = data.get("products", [])
            if not batch:
                break
            products.extend(batch)
            if len(batch) < limit:
                break
            page += 1
        except requests.exceptions.RequestException as e:
            print(f"Error fetching products page {page}: {e}")
            break

    return products


def parse_range(text: str) -> Tuple[str, str]:
    """Parse a string like '9.5 - 11.5%' or '9.5-11.5' into (from, to) values."""
    if not text:
        return "", ""
    # Strip units and whitespace
    text_clean = re.sub(r"%|mL/100g", "", text).strip()
    # Handle en-dash and regular dash
    dash_match = re.search(r"([\d.]+)\s*[-\u2013]\s*([\d.]+)", text_clean)
    if dash_match:
        return dash_match.group(1), dash_match.group(2)
    val = re.sub(r"[^0-9.]", "", text_clean)
    return val, ""


def parse_brewing_values(body_html: str) -> dict:
    """Extract brewing values from product description HTML."""
    soup = BeautifulSoup(body_html, "html.parser")
    text = soup.get_text(separator="\n")
    values = {}

    # Try table rows first (structured tables)
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) >= 2:
            key_text = cells[0].get_text(strip=True).lower()
            val_text = cells[1].get_text(strip=True)
            if "alpha" in key_text and "beta" not in key_text:
                from_val, to_val = parse_range(val_text)
                values["alpha_from"] = from_val
                values["alpha_to"] = to_val
            elif "beta" in key_text:
                from_val, to_val = parse_range(val_text)
                values["beta_from"] = from_val
                values["beta_to"] = to_val
            elif "cohumulone" in key_text or "co-h" in key_text:
                from_val, to_val = parse_range(val_text)
                values["co_h_from"] = from_val
                values["co_h_to"] = to_val
            elif "oil" in key_text:
                from_val, to_val = parse_range(val_text)
                values["oil_from"] = from_val
                values["oil_to"] = to_val

    # Fall back to regex on plain text for common label patterns
    patterns = [
        ("alpha_from", "alpha_to",
         r"Alpha\s*Acids?:?\s*([\d.]+)\s*[-\u2013]\s*([\d.]+)"),
        ("beta_from", "beta_to",
         r"Beta\s*Acids?:?\s*([\d.]+)\s*[-\u2013]\s*([\d.]+)"),
        ("co_h_from", "co_h_to",
         r"Cohumulone:?\s*([\d.]+)\s*[-\u2013]\s*([\d.]+)"),
        ("oil_from", "oil_to",
         r"(?:Total\s*)?Oil:?\s*([\d.]+)\s*[-\u2013]\s*([\d.]+)"),
    ]
    for from_key, to_key, pattern in patterns:
        if from_key not in values:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                values[from_key] = match.group(1)
                values[to_key] = match.group(2)

    return values


def parse_notes(body_html: str) -> List[str]:
    """Extract aroma/flavor notes from product description HTML."""
    soup = BeautifulSoup(body_html, "html.parser")
    text = soup.get_text(separator="\n")

    # Look for an aroma/flavor/sensory section
    aroma_match = re.search(
        r"(?:Aroma|Flavor|Flavour|Sensory\s*Notes?|Aroma\s*Profile)"
        r"(?:\s*Notes?)?:?\s*([^\n\r]+)",
        text,
        re.IGNORECASE,
    )
    if aroma_match:
        aroma_text = aroma_match.group(1).strip()
        notes = [n.strip() for n in re.split(r"[,;]", aroma_text) if n.strip()]
        if notes:
            return notes

    return []


def get_country_from_tags(tags: List[str]) -> str:
    """Determine the country of origin from Shopify product tags."""
    for tag in tags:
        tag_lower = tag.lower().strip()
        # Exact match first
        if tag_lower in COUNTRY_TAG_MAP:
            return COUNTRY_TAG_MAP[tag_lower]
        # Substring match
        for key, country in COUNTRY_TAG_MAP.items():
            if key in tag_lower:
                return country
    return "USA"  # Yakima Valley Hops primarily sells US hops


def process_product(product: dict) -> Optional[HopEntry]:
    """Convert a Shopify product dict into a HopEntry."""
    try:
        name = product.get("title", "").strip()
        handle = product.get("handle", "")
        body_html = product.get("body_html") or ""
        tags = product.get("tags") or []

        if not name:
            return None

        # Some products (e.g., accessories) may have no brewing data — skip them
        # if the description doesn't mention alpha acids
        if body_html and not re.search(r"alpha", body_html, re.IGNORECASE):
            return None

        country = get_country_from_tags(tags)
        brewing_values = parse_brewing_values(body_html)
        notes = parse_notes(body_html)
        href = f"{BASE_URL}/products/{handle}"

        hop_entry = HopEntry(
            name=name,
            country=country,
            source="Yakima Valley Hops",
            href=href,
            alpha_from=brewing_values.get("alpha_from", ""),
            alpha_to=brewing_values.get("alpha_to", ""),
            beta_from=brewing_values.get("beta_from", ""),
            beta_to=brewing_values.get("beta_to", ""),
            oil_from=brewing_values.get("oil_from", ""),
            oil_to=brewing_values.get("oil_to", ""),
            co_h_from=brewing_values.get("co_h_from", ""),
            co_h_to=brewing_values.get("co_h_to", ""),
            notes=notes,
        )
        # No structured aroma chart data is available on Yakima Valley Hops;
        # only brewing values and text sensory notes are present.
        return hop_entry

    except Exception as e:
        print(f"Error processing product '{product.get('title', 'unknown')}': {e}")
        return None


def scrape(save=False) -> List[HopEntry]:
    """Scrape all hops from Yakima Valley Hops."""
    print("Fetching hop products from Yakima Valley Hops...")
    products = get_all_hop_products()

    if not products:
        print("No products found.")
        return []

    print(f"Found {len(products)} products. Processing...")

    hop_entries = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(process_product, p) for p in products]
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                hop_entries.append(result)

    print(f"Successfully scraped {len(hop_entries)} hops from Yakima Valley Hops.")

    if save:
        output_file = "data/yakimavalleyhops.json"
        save_hop_entries(hop_entries, output_file)

    return hop_entries


def main():
    scrape()


if __name__ == "__main__":
    main()
