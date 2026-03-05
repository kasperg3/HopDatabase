"""
John I. Haas Hop Scraper

Scrapes hop data from https://www.johnihaas.com/hops/
This source provides brewing values (alpha, beta, cohumulone, oil) without sensory analysis.
"""

import re
import concurrent.futures
from typing import Optional, Tuple, List

import requests
from bs4 import BeautifulSoup

from ..models.hop_model import HopEntry, save_hop_entries

BASE_URL = "https://www.johnihaas.com"
CATALOG_URL = "https://www.johnihaas.com/hops/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
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
    # Handle single values
    single = re.search(r"([\d.]+)", text)
    if single:
        val = single.group(1)
        return val, val
    return "", ""


def get_hop_links(catalog_url: str) -> List[str]:
    """Fetches the catalog page and returns all individual hop page URLs."""
    try:
        response = requests.get(catalog_url, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        hop_links = set()

        # Hop variety links are typically in anchor tags pointing to /hops/{variety}/
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            # Match individual hop pages: /hops/<slug>/ (not the listing page itself)
            if re.match(r"^(https?://www\.johnihaas\.com)?/hops/[^/]+/?$", href):
                full_url = href if href.startswith("http") else BASE_URL + href
                # Exclude the main catalog page itself
                if full_url.rstrip("/") != catalog_url.rstrip("/"):
                    hop_links.add(full_url)

        print(f"Found {len(hop_links)} unique hop links on John I. Haas.")
        return list(hop_links)

    except requests.exceptions.RequestException as e:
        print(f"Error fetching John I. Haas catalog: {e}")
        return []


def process_hop_page(hop_url: str) -> Optional[HopEntry]:
    """Fetches and processes a single hop page, returning a HopEntry."""
    try:
        response = requests.get(hop_url, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        # --- Extract hop name ---
        name = ""
        h1 = soup.find("h1")
        if h1:
            name = h1.get_text(strip=True)
        if not name:
            # Fallback: derive name from URL slug
            slug = hop_url.rstrip("/").split("/")[-1]
            name = slug.replace("-", " ").title()

        # --- Extract country ---
        # John I. Haas primarily deals in US hops but also carries international varieties
        country = "USA"
        # Some pages may mention country of origin in the text
        page_text = soup.get_text(" ", strip=True).lower()
        country_keywords = {
            "germany": "Germany",
            "german": "Germany",
            "czech": "Czech Republic",
            "new zealand": "New Zealand",
            "australia": "Australia",
            "united kingdom": "United Kingdom",
            "uk hops": "United Kingdom",
            "slovenia": "Slovenia",
            "poland": "Poland",
            "france": "France",
        }
        for keyword, country_name in country_keywords.items():
            if keyword in page_text:
                country = country_name
                break

        # --- Extract brewing values from tables or structured paragraphs ---
        brewing_data = {}

        # Look for tables first (common pattern for hop data)
        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True).lower()
                    value = cells[1].get_text(strip=True)
                    brewing_data[key] = value

        # Also look for definition lists (<dl>/<dt>/<dd>) and labeled paragraphs
        for dl in soup.find_all("dl"):
            dts = dl.find_all("dt")
            dds = dl.find_all("dd")
            for dt, dd in zip(dts, dds):
                key = dt.get_text(strip=True).lower()
                value = dd.get_text(strip=True)
                brewing_data[key] = value

        # Look for key:value patterns in paragraphs/divs
        for elem in soup.find_all(["p", "div", "li", "span"]):
            text = elem.get_text(strip=True)
            # Match patterns like "Alpha: 5.5 - 8.5%" or "Alpha Acids: 5.5-8.5%"
            for pattern, key in [
                (r"(?i)alpha\s*(?:acid[s]?)?\s*[:\-]\s*([\d.\s%–-]+)", "alpha"),
                (r"(?i)beta\s*(?:acid[s]?)?\s*[:\-]\s*([\d.\s%–-]+)", "beta"),
                (r"(?i)co-?h(?:umulone)?\s*[:\-]\s*([\d.\s%–-]+)", "cohumulone"),
                (r"(?i)oil\s*(?:content|total)?\s*[:\-]\s*([\d.\s%–mLg/\-–]+)", "oil"),
            ]:
                m = re.search(pattern, text)
                if m and key not in brewing_data:
                    brewing_data[key] = m.group(1).strip()

        # --- Parse brewing value ranges ---
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

        # --- Extract aroma/flavor notes ---
        notes = []
        for keyword in ["aroma", "flavor", "flavour", "aroma profile", "flavor profile"]:
            for elem in soup.find_all(["p", "div", "li"]):
                text = elem.get_text(strip=True)
                if keyword in text.lower() and len(text) < 500:
                    # Extract comma-separated notes
                    note_text = re.sub(r"(?i)(aroma|flavor|flavour)[:\s]*", "", text)
                    candidate_notes = [n.strip() for n in re.split(r"[,;]", note_text) if n.strip()]
                    if candidate_notes and not notes:
                        notes = candidate_notes
                    break

        # Skip entries without any useful data
        if not alpha_from and not alpha_to and not beta_from and not beta_to:
            print(f"  Skipping {name} - no brewing data found")
            return None

        hop_entry = HopEntry(
            name=name,
            country=country,
            source="John I. Haas",
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

        print(f"  Processed: {hop_entry.name} (alpha: {alpha_from}-{alpha_to}%)")
        return hop_entry

    except Exception as e:
        print(f"  Error processing {hop_url}: {e}")
        return None


def scrape(save: bool = False) -> List[HopEntry]:
    """Main function to scrape all hops from John I. Haas."""
    hop_links = get_hop_links(CATALOG_URL)

    if not hop_links:
        print("No hop links found for John I. Haas.")
        return []

    hop_entries = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_hop_page, url): url for url in hop_links}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                hop_entries.append(result)

    print(f"\nJohn I. Haas: successfully scraped {len(hop_entries)} of {len(hop_links)} hops.")

    if save:
        save_hop_entries(hop_entries, "data/johnihaas.json")

    return hop_entries


def main():
    scrape(save=True)


if __name__ == "__main__":
    main()
