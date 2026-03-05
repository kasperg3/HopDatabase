# hop_database/scrapers/hops_australia.py

"""
Scraper for Hop Products Australia (hops.com.au)

Extracts hop data from the main listing page, individual hop pages,
and PDF technical data sheets (for sensory analysis).
"""

import io
import re
import concurrent.futures
from typing import Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup
import pdfplumber

from ..models.hop_model import HopEntry, save_hop_entries

BASE_URL = "https://www.hops.com.au"
HOPS_LISTING_URL = "https://www.hops.com.au/hops/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
}

# HPA sensory category names that appear in their PDFs → standard aroma keys
# These match the labels used in HPA technical data sheet PDFs.
HPA_SENSORY_CATEGORIES = {
    "Citrus": "Citrus",
    "Tropical": "Tropical Fruit",
    "Tropical Fruit": "Tropical Fruit",
    "Stone Fruit": "Stone Fruit",
    "Floral": "Floral",
    "Herbal": "Herbal",
    "Earthy": "Herbal",
    "Grassy": "Grassy",
    "Resinous": "Resin/Pine",
    "Pine": "Resin/Pine",
    "Spicy": "Spice",
    "Spice": "Spice",
    "Berry": "Berry",
    "Passionfruit": "Tropical Fruit",
    "Peach": "Stone Fruit",
    "Mango": "Tropical Fruit",
    "Lemon": "Citrus",
    "Orange": "Citrus",
    "Lime": "Citrus",
    "Pineapple": "Tropical Fruit",
}


def get_hop_links(listing_url: str = HOPS_LISTING_URL) -> List[str]:
    """
    Fetch the main hop listing page and return all individual hop page URLs.
    """
    print(f"Fetching hop listing from {listing_url} ...")
    try:
        response = requests.get(listing_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        print(f"Error fetching listing page: {exc}")
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    hop_links: List[str] = []

    # hops.com.au is a WordPress site; hop pages are linked from article cards.
    # Try several common selectors in priority order.
    candidates = (
        # WordPress archive / loop article titles
        soup.find_all("h2", class_=re.compile(r"entry-title|post-title", re.I))
        or soup.find_all("h3", class_=re.compile(r"entry-title|post-title", re.I))
        # Generic card / grid links that point to /hops/{slug}/ paths
        or []
    )

    seen: set = set()
    for heading in candidates:
        a_tag = heading.find("a", href=True)
        if a_tag:
            href = a_tag["href"]
            if href not in seen:
                seen.add(href)
                hop_links.append(href)

    # Fallback: collect every internal link whose path looks like a hop slug.
    # A valid hop link must:
    #   - be an absolute URL on the same domain
    #   - not be the listing page or the site root
    #   - not point to the /hops/ archive itself (only slugs beneath it)
    #   - not be a static resource or WordPress admin path
    if not hop_links:
        listing_path = HOPS_LISTING_URL.rstrip("/")
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"].rstrip("/")
            is_on_domain = href.startswith(BASE_URL)
            is_not_root = href != BASE_URL
            is_not_listing = href != listing_path
            is_not_resource = not re.search(r"\.(pdf|png|jpg|css|js)$", href, re.I)
            is_not_wp = "/wp-" not in href and "/#" not in href
            if (
                is_on_domain
                and is_not_root
                and is_not_listing
                and is_not_resource
                and is_not_wp
                and href not in seen
            ):
                seen.add(href)
                hop_links.append(href)

    print(f"Found {len(hop_links)} hop links.")
    return hop_links


def parse_brewing_values(soup: BeautifulSoup) -> Dict[str, str]:
    """
    Extract essential brewing values from the hop page HTML.

    Returns a dict with keys: alpha, beta, cohumulone, oil.
    Values are raw strings (e.g. '12.5 - 14.5').
    """
    values: Dict[str, str] = {}

    # Strategy 1: look for a table whose rows contain known key labels.
    key_pattern = re.compile(
        r"alpha|beta|cohumulone|total\s+oil|oil\s+content", re.I
    )
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = [td.get_text(" ", strip=True) for td in row.find_all(["td", "th"])]
            if len(cells) >= 2 and key_pattern.search(cells[0]):
                label = cells[0].lower()
                raw_val = cells[1]
                if "alpha" in label and "co" not in label:
                    values.setdefault("alpha", raw_val)
                elif "beta" in label:
                    values.setdefault("beta", raw_val)
                elif "cohumulone" in label or "co-humulone" in label:
                    values.setdefault("cohumulone", raw_val)
                elif "oil" in label:
                    values.setdefault("oil", raw_val)

    # Strategy 2: look for definition lists (<dl>/<dt>/<dd>) or labelled paragraphs.
    if len(values) < 2:
        for dl in soup.find_all("dl"):
            dts = dl.find_all("dt")
            dds = dl.find_all("dd")
            for dt, dd in zip(dts, dds):
                label = dt.get_text(strip=True).lower()
                raw_val = dd.get_text(" ", strip=True)
                if "alpha" in label and "co" not in label:
                    values.setdefault("alpha", raw_val)
                elif "beta" in label:
                    values.setdefault("beta", raw_val)
                elif "cohumulone" in label:
                    values.setdefault("cohumulone", raw_val)
                elif "oil" in label:
                    values.setdefault("oil", raw_val)

    # Strategy 3: scan every paragraph / div for "Key: value" inline text.
    if len(values) < 2:
        text_blocks = [
            elem.get_text(" ", strip=True)
            for elem in soup.find_all(["p", "div", "li", "span"])
        ]
        for text in text_blocks:
            if re.search(r"\d", text):
                for match in re.finditer(
                    r"(alpha|beta|cohumulone|total oil|oil content)"
                    r"\s*[:\-–]\s*([\d\s.\-–%]+)",
                    text,
                    re.I,
                ):
                    key = match.group(1).lower()
                    val = match.group(2).strip()
                    if "alpha" in key and "co" not in key:
                        values.setdefault("alpha", val)
                    elif "beta" in key:
                        values.setdefault("beta", val)
                    elif "cohumulone" in key:
                        values.setdefault("cohumulone", val)
                    elif "oil" in key:
                        values.setdefault("oil", val)

    return values


def parse_range(text: str) -> Tuple[str, str]:
    """
    Parse a string like '12.5 - 14.5%' into (from_val, to_val) strings.
    """
    if not text:
        return "", ""
    text = text.strip()
    # Remove unit suffixes
    text = re.sub(r"[%a-zA-Z/]", "", text).strip()
    # Normalise dash variants
    text = re.sub(r"\s*[–—]\s*", "-", text)
    if "-" in text:
        parts = [p.strip() for p in text.split("-", 1)]
        from_val = re.sub(r"[^0-9.]", "", parts[0])
        to_val = re.sub(r"[^0-9.]", "", parts[1])
        return from_val, to_val
    val = re.sub(r"[^0-9.]", "", text)
    return val, val


def find_pdf_url(soup: BeautifulSoup, page_url: str) -> Optional[str]:
    """
    Look for a PDF technical data sheet link on the hop page.
    """
    # Direct PDF links
    for a_tag in soup.find_all("a", href=re.compile(r"\.pdf$", re.I)):
        href = a_tag["href"]
        if href.startswith("http"):
            return href
        return BASE_URL.rstrip("/") + "/" + href.lstrip("/")

    # Links labelled "data sheet", "technical", "download" etc.
    for a_tag in soup.find_all("a", href=True):
        label = a_tag.get_text(strip=True).lower()
        if any(kw in label for kw in ("data sheet", "technical", "download", "pdf")):
            href = a_tag["href"]
            if href.endswith(".pdf") or "pdf" in href.lower():
                if href.startswith("http"):
                    return href
                return BASE_URL.rstrip("/") + "/" + href.lstrip("/")
    return None


def parse_pdf_sensory(pdf_content: bytes) -> Dict[str, float]:
    """
    Extract sensory/aroma intensity values from an HPA PDF technical data sheet.

    HPA PDFs include a "Sensory Analysis" section with aroma categories and
    scores on a 1–10 scale.  We try both table extraction and line-by-line text
    parsing so the code is resilient to layout differences across varieties.
    """
    sensory: Dict[str, float] = {}

    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                # --- attempt 1: structured table extraction ---
                tables = page.extract_tables() or []
                for table in tables:
                    for row in (table or []):
                        if not row:
                            continue
                        cells = [str(c).strip() if c else "" for c in row]
                        if len(cells) >= 2:
                            label = cells[0]
                            score_str = cells[-1]
                            # Match known aroma category names
                            mapped = _map_sensory_label(label)
                            if mapped:
                                score = _parse_score(score_str)
                                if score is not None:
                                    sensory[mapped] = max(sensory.get(mapped, 0.0), score)

                # --- attempt 2: line-by-line text parsing ---
                text = page.extract_text() or ""
                lines = text.splitlines()
                in_sensory = False
                for line in lines:
                    # Detect the sensory section header
                    if re.search(r"sensory\s+anal", line, re.I):
                        in_sensory = True
                        continue
                    # Stop at the next major section
                    if in_sensory and re.search(
                        r"(oil\s+compos|usage|brewing\s+val|storage|note)", line, re.I
                    ):
                        in_sensory = False
                        continue

                    if not in_sensory:
                        continue

                    # Lines like "Citrus 8" or "Tropical Fruit  7"
                    # Sometimes the number appears at the end after spaces.
                    match = re.match(
                        r"^([A-Za-z][A-Za-z\s/]+?)\s{2,}(\d+(?:\.\d+)?)\s*$", line
                    )
                    if not match:
                        # Try "Citrus: 8" or "Citrus - 8"
                        match = re.match(
                            r"^([A-Za-z][A-Za-z\s/]+?)\s*[:\-–]\s*(\d+(?:\.\d+)?)\s*$",
                            line,
                        )
                    if match:
                        label = match.group(1).strip()
                        score_str = match.group(2).strip()
                        mapped = _map_sensory_label(label)
                        if mapped:
                            score = _parse_score(score_str)
                            if score is not None:
                                sensory[mapped] = max(sensory.get(mapped, 0.0), score)

    except Exception as exc:
        print(f"  Warning: could not parse PDF for sensory data: {exc}")

    return sensory


def _map_sensory_label(label: str) -> Optional[str]:
    """
    Map a raw PDF sensory label to a key in HPA_SENSORY_CATEGORIES.

    Returns the matching HPA_SENSORY_CATEGORIES key (e.g. "Citrus", "Tropical")
    so that ``parse_pdf_sensory`` can build a source-keyed dict that
    ``HopEntry.set_standardized_aromas("australianhops", ...)`` will then map
    to the standard aroma categories via AROMA_MAPPINGS["australianhops"].
    Returns None if no match is found.
    """
    label = label.strip()
    # Exact match first (case-insensitive)
    for key in HPA_SENSORY_CATEGORIES:
        if label.lower() == key.lower():
            return key
    # Partial / substring match as a fallback
    for key in HPA_SENSORY_CATEGORIES:
        if key.lower() in label.lower() or label.lower() in key.lower():
            return key
    return None


def _parse_score(text: str) -> Optional[float]:
    """Extract a numeric score from a string.  Returns None if not possible."""
    m = re.search(r"\d+(?:\.\d+)?", text or "")
    if m:
        return float(m.group(0))
    return None


def parse_aroma_notes(soup: BeautifulSoup) -> List[str]:
    """
    Extract free-text aroma / flavour descriptor notes from the hop page.
    """
    notes: List[str] = []

    # Look for elements with aroma-related class names first
    for selector in (
        re.compile(r"aroma|flavou?r|tasting|descriptor", re.I),
    ):
        for elem in soup.find_all(["p", "div", "ul", "li"], class_=selector):
            text = elem.get_text(", ", strip=True)
            if text:
                notes.extend([n.strip() for n in re.split(r"[,;]", text) if n.strip()])

    # Fallback: look for comma-separated lists inside the main content
    if not notes:
        main = soup.find("main") or soup.find("div", class_=re.compile(r"content|entry", re.I))
        if main:
            for p_tag in main.find_all("p"):
                text = p_tag.get_text(strip=True)
                parts = [t.strip() for t in re.split(r"[,;]", text) if t.strip()]
                # A "notes" paragraph is short, all-lowercase word tokens
                if 2 <= len(parts) <= 15 and all(
                    re.match(r"^[a-zA-Z\s\-/]+$", p) for p in parts
                ):
                    notes.extend(parts)
                    break

    return [n.lower() for n in notes if n]


def process_hop_page(hop_url: str) -> Optional[HopEntry]:
    """
    Fetch a single hop page, extract brewing values, aroma notes, and
    sensory data from the linked PDF data sheet, then return a HopEntry.
    """
    try:
        response = requests.get(hop_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        print(f"  Error fetching {hop_url}: {exc}")
        return None

    soup = BeautifulSoup(response.content, "html.parser")

    # --- Name ---
    h1 = soup.find("h1")
    name = h1.get_text(strip=True) if h1 else ""
    if not name:
        # Derive from URL slug
        slug = hop_url.rstrip("/").rsplit("/", 1)[-1]
        name = slug.replace("-", " ").title()

    # --- Brewing values ---
    bv = parse_brewing_values(soup)
    alpha_from, alpha_to = parse_range(bv.get("alpha", ""))
    beta_from, beta_to = parse_range(bv.get("beta", ""))
    coh_from, coh_to = parse_range(bv.get("cohumulone", ""))
    oil_from, oil_to = parse_range(bv.get("oil", ""))

    # --- Aroma notes ---
    notes = parse_aroma_notes(soup)

    # --- Sensory data from PDF ---
    sensory_data: Dict[str, float] = {}
    pdf_url = find_pdf_url(soup, hop_url)
    if pdf_url:
        try:
            pdf_response = requests.get(pdf_url, headers=HEADERS, timeout=60)
            pdf_response.raise_for_status()
            sensory_data = parse_pdf_sensory(pdf_response.content)
        except requests.exceptions.RequestException as exc:
            print(f"  Warning: could not download PDF {pdf_url}: {exc}")

    hop_entry = HopEntry(
        name=name,
        country="Australia",
        source="Hop Products Australia",
        href=hop_url,
        alpha_from=alpha_from,
        alpha_to=alpha_to,
        beta_from=beta_from,
        beta_to=beta_to,
        oil_from=oil_from,
        oil_to=oil_to,
        co_h_from=coh_from,
        co_h_to=coh_to,
        notes=notes,
    )
    hop_entry.set_standardized_aromas("australianhops", sensory_data)

    print(f"  Processed: {name} (AU) — alpha {alpha_from}-{alpha_to}%")
    return hop_entry


def scrape(save: bool = False) -> List[HopEntry]:
    """
    Main entry point: scrape all hops from hops.com.au.

    Args:
        save: If True, save results to data/hops_australia.json.

    Returns:
        List of HopEntry objects.
    """
    hop_links = get_hop_links()
    if not hop_links:
        print("No hop links found for hops.com.au — skipping.")
        return []

    hop_entries: List[HopEntry] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_url = {
            executor.submit(process_hop_page, url): url for url in hop_links
        }
        for future in concurrent.futures.as_completed(future_to_url):
            result = future.result()
            if result:
                hop_entries.append(result)

    print(f"\nHop Products Australia: scraped {len(hop_entries)} of {len(hop_links)} hops.")

    if save:
        save_hop_entries(hop_entries, "data/hops_australia.json")

    return hop_entries


def main():
    scrape(save=True)


if __name__ == "__main__":
    main()
