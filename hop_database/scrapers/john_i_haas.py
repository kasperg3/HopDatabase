"""
John I. Haas Hop Scraper

Scrapes hop data from https://www.johnihaas.com/products/hops/
and subcategory pages. Hop pages live at root-level slugs like
/bru-1/, /el-dorado/, /sabro/ and link to PDF spec sheets.
Brewing values and aroma data are parsed from both the page HTML
and the PDF.
"""

import io
import re
import concurrent.futures
from typing import Dict, Optional, Tuple, List, Set

import requests
from bs4 import BeautifulSoup

from ..models.hop_model import HopEntry, save_hop_entries

BASE_URL = "https://www.johnihaas.com"

# All pages that may link to hop pages or PDF spec sheets
CATALOG_PAGES = [
    "https://www.johnihaas.com/products/hops/",
    "https://www.johnihaas.com/products/bittering/",
    "https://www.johnihaas.com/products/flavor-and-aroma/",
]

# Root-level slugs that are NOT hop variety pages
NON_HOP_SLUGS = {
    "about-us", "contact-us", "donations", "harvest", "how-to-buy",
    "news-views", "privacy-policy", "terms-and-conditions-of-website-usage",
    "termsandconditions", "products", "wp-content", "wp-admin",
    "australian-hops",  # category landing page, not a variety
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

PAGE_TIMEOUT = 30
PDF_TIMEOUT = 60


def parse_range(text: str) -> Tuple[str, str]:
    """Parses a numeric range string like '5.5 - 8.5' or '< 10' into (from, to) values."""
    if not text:
        return "", ""
    text = text.strip()
    match = re.search(r"([\d.]+)\s*[-–]\s*([\d.]+)", text)
    if match:
        return match.group(1), match.group(2)
    single = re.search(r"([\d.]+)", text)
    if single:
        val = single.group(1)
        return val, val
    return "", ""


def hop_name_from_pdf_filename(pdf_url: str) -> str:
    """Derive a best-guess hop name from a PDF filename."""
    filename = pdf_url.rstrip("/").split("/")[-1]
    # Strip extension
    name = re.sub(r"\.pdf$", "", filename, flags=re.I)
    # Strip common prefixes/suffixes
    for prefix in [
        r"^MiniSpecSheets[-_]",
        r"^Haas_HopSpecSheets[-_]",
        r"^Technical[-_](?:sheet|data)s?[-_]",
        r"^HopSpecSheet[-_]",
        r"^SpecSheet[-_]",
    ]:
        name = re.sub(prefix, "", name, flags=re.I)
    for suffix in [r"[-_]Eng$", r"[-_]\d{4}$", r"[-_]Specs?$"]:
        name = re.sub(suffix, "", name, flags=re.I)
    # Replace dashes/underscores with spaces and title-case
    name = re.sub(r"[-_]", " ", name).strip().title()
    return name


def collect_catalog_links() -> Tuple[Dict[str, str], Set[str]]:
    """
    Fetches all catalog pages and returns:
      - pdf_links: {pdf_url: anchor_text}
      - hop_page_links: set of root-level hop variety page URLs
    """
    pdf_links: Dict[str, str] = {}
    hop_page_links: Set[str] = set()

    for catalog_url in CATALOG_PAGES:
        try:
            resp = requests.get(catalog_url, headers=HEADERS, timeout=PAGE_TIMEOUT)
            resp.raise_for_status()
            print(f"  [DEBUG] Fetched {catalog_url} → {resp.status_code}")
            soup = BeautifulSoup(resp.content, "html.parser")

            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"]

                # Direct PDF links (wp-content/uploads/*.pdf)
                if "wp-content/uploads" in href and href.lower().endswith(".pdf"):
                    full_url = href if href.startswith("http") else BASE_URL + href
                    if full_url not in pdf_links:
                        anchor = a_tag.get_text(strip=True)
                        pdf_links[full_url] = anchor
                        print(f"    [DEBUG] PDF link: {full_url!r} (anchor: {anchor!r})")
                    continue

                # Root-level hop variety page links: /slug/ or https://www.johnihaas.com/slug/
                full_url = href if href.startswith("http") else BASE_URL + href
                m = re.match(r"^https?://www\.johnihaas\.com/([^/]+)/?$", full_url)
                if m:
                    slug = m.group(1)
                    if slug and slug not in NON_HOP_SLUGS:
                        hop_page_links.add(full_url.rstrip("/"))

        except requests.exceptions.RequestException as e:
            print(f"  Error fetching catalog page {catalog_url}: {e}")

    print(f"  [DEBUG] Collected {len(pdf_links)} PDF links and {len(hop_page_links)} root-level hop page links")
    print(f"  [DEBUG] Root-level hop pages: {sorted(hop_page_links)}")
    return pdf_links, hop_page_links


def find_pdf_url(soup: BeautifulSoup) -> Optional[str]:
    """Find the PDF spec sheet link on a hop variety page."""
    for a_tag in soup.find_all("a", href=re.compile(r"\.pdf$", re.I)):
        href = a_tag["href"]
        return href if href.startswith("http") else BASE_URL + href

    for a_tag in soup.find_all("a", href=True):
        label = a_tag.get_text(strip=True).lower()
        href = a_tag["href"]
        if any(kw in label for kw in ("spec sheet", "data sheet", "download", "pdf")):
            if href.endswith(".pdf") or "pdf" in href.lower():
                return href if href.startswith("http") else BASE_URL + href

    return None


def parse_pdf_data(pdf_content: bytes) -> Dict:
    """
    Extract brewing values, aroma notes, and description from a Haas PDF spec sheet.
    Returns a dict with keys: alpha, beta, cohumulone, oil, notes, description.
    """
    result: Dict = {"alpha": "", "beta": "", "cohumulone": "", "oil": "", "notes": [], "description": ""}

    try:
        import pdfplumber
    except ImportError:
        print("  Warning: pdfplumber not installed — skipping PDF parsing.")
        return result

    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            full_text = ""
            for page in pdf.pages:
                full_text += (page.extract_text() or "") + "\n"

            # Brewing values.
            # Handles three PDF formats seen in the wild:
            #   MiniSpecSheet:  "Alpha (%) 13-17"
            #   Haas:           "Alpha Acids* 10.1 - 14.1%"
            #   HPA:            "Alpha 16.2 – 18.4%"
            # Key fix: capture only digit-range, not arbitrary whitespace (old [\d.\s\-–]+
            # could match empty/whitespace strings).  Optional parenthetical units like
            # "(%)" or "(% of Alpha Acids)" or "(ml/100g)" are skipped via (?:\([^)]*\))?.
            for pattern, key in [
                (r"(?i)alpha\s*(?:acids?\*?)?\s*(?:\([^)]*\))?\s*\*?\s*([\d.]+\s*[-–]\s*[\d.]+)", "alpha"),
                (r"(?i)beta\s*(?:acids?\*?)?\s*(?:\([^)]*\))?\s*\*?\s*([\d.]+\s*[-–]\s*[\d.]+)", "beta"),
                (r"(?i)co-?h(?:um(?:ulone)?)?\s*(?:\([^)]*\))?\s*([\d.]+\s*[-–]\s*[\d.]+)", "cohumulone"),
                (r"(?i)(?:total\s+)?oil(?:\s+content)?\s*(?:\([^)]*\))?\s*([\d.]+\s*[-–]\s*[\d.]+)", "oil"),
            ]:
                m = re.search(pattern, full_text)
                if m and not result[key]:
                    result[key] = m.group(1).strip()

            # Aroma/flavor notes — comma-separated descriptors
            for pattern in [
                r"(?i)aroma[:\s]+([a-zA-Z ,/&\-]+?)(?:\n|\.)",
                r"(?i)flavor[:\s]+([a-zA-Z ,/&\-]+?)(?:\n|\.)",
                r"(?i)sensory[:\s]+([a-zA-Z ,/&\-]+?)(?:\n|\.)",
            ]:
                m = re.search(pattern, full_text)
                if m:
                    raw = m.group(1).strip()
                    candidates = [n.strip() for n in re.split(r"[,;]", raw) if n.strip()]
                    if candidates:
                        result["notes"] = candidates
                        break

            # Description — first substantial paragraph-like block
            lines = [l.strip() for l in full_text.splitlines() if len(l.strip()) > 60]
            for line in lines:
                if not re.match(r"(?i)^(alpha|beta|cohumulone|oil|storage|copyright|john i\. haas)", line):
                    result["description"] = line
                    break

    except Exception as exc:
        print(f"  Warning: could not parse PDF: {exc}")

    return result


def _extract_country(page_text: str) -> str:
    """Detect hop origin country from page text."""
    for keyword, country_name in {
        "germany": "Germany", "german": "Germany",
        "czech": "Czech Republic",
        "new zealand": "New Zealand",
        "australia": "Australia",
        "united kingdom": "United Kingdom",
        "slovenia": "Slovenia",
        "poland": "Poland",
        "france": "France",
    }.items():
        if keyword in page_text.lower():
            return country_name
    return "USA"


def _extract_brewing_from_html(soup: BeautifulSoup) -> Dict[str, str]:
    """Extract brewing value strings from HTML tables, definition lists, and inline text."""
    brewing: Dict[str, str] = {}

    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                key = cells[0].get_text(strip=True).lower()
                brewing[key] = cells[1].get_text(strip=True)

    for dl in soup.find_all("dl"):
        for dt, dd in zip(dl.find_all("dt"), dl.find_all("dd")):
            brewing[dt.get_text(strip=True).lower()] = dd.get_text(strip=True)

    for elem in soup.find_all(["p", "div", "li", "span"]):
        text = elem.get_text(strip=True)
        for pattern, key in [
            (r"(?i)alpha\s*(?:acid[s]?)?\s*[:\-]\s*([\d.\s%–-]+)", "alpha"),
            (r"(?i)beta\s*(?:acid[s]?)?\s*[:\-]\s*([\d.\s%–-]+)", "beta"),
            (r"(?i)co-?h(?:umulone)?\s*[:\-]\s*([\d.\s%–-]+)", "cohumulone"),
            (r"(?i)(?:total\s+)?oil\s*(?:content)?\s*[:\-]\s*([\d.\s%–mLg/\-–]+)", "oil"),
        ]:
            m = re.search(pattern, text)
            if m and key not in brewing:
                brewing[key] = m.group(1).strip()

    return brewing


def process_hop_page(hop_url: str, known_pdf_url: Optional[str] = None) -> Optional[HopEntry]:
    """Fetches a hop variety page, finds its PDF, and returns a HopEntry."""
    try:
        response = requests.get(hop_url, headers=HEADERS, timeout=PAGE_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
    except requests.exceptions.RequestException as e:
        print(f"  Error fetching {hop_url}: {e}")
        return None

    h1 = soup.find("h1")
    name = h1.get_text(strip=True) if h1 else hop_url.rstrip("/").split("/")[-1].replace("-", " ").title()
    country = _extract_country(soup.get_text(" ", strip=True))
    brewing = _extract_brewing_from_html(soup)
    alpha_raw = brewing.get("alpha", brewing.get("alpha acids", ""))
    beta_raw = brewing.get("beta", brewing.get("beta acids", ""))
    coh_raw = brewing.get("cohumulone", brewing.get("co-h", ""))
    oil_raw = brewing.get("oil", brewing.get("total oil", ""))

    alpha_from, alpha_to = parse_range(alpha_raw)
    beta_from, beta_to = parse_range(beta_raw)
    co_h_from, co_h_to = parse_range(coh_raw)
    oil_from, oil_to = parse_range(oil_raw)

    notes: List[str] = []
    description = ""
    main = soup.find("main") or soup.find("div", class_=re.compile(r"content|entry|main", re.I))
    if main:
        for p in main.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 60 and not re.match(r"(?i)^(alpha|beta|cohumulone|oil|storage|copyright)", text):
                description = description or text
            if any(kw in text.lower() for kw in ("aroma", "flavor", "flavour")):
                candidates = [n.strip() for n in re.split(r"[,;]", text) if n.strip()]
                notes = notes or candidates

    pdf_url = known_pdf_url or find_pdf_url(soup)
    if pdf_url:
        try:
            pdf_resp = requests.get(pdf_url, headers=HEADERS, timeout=PDF_TIMEOUT)
            pdf_resp.raise_for_status()
            pdf_data = parse_pdf_data(pdf_resp.content)

            if not alpha_from and pdf_data["alpha"]:
                alpha_from, alpha_to = parse_range(pdf_data["alpha"])
            if not beta_from and pdf_data["beta"]:
                beta_from, beta_to = parse_range(pdf_data["beta"])
            if not co_h_from and pdf_data["cohumulone"]:
                co_h_from, co_h_to = parse_range(pdf_data["cohumulone"])
            if not oil_from and pdf_data["oil"]:
                oil_from, oil_to = parse_range(pdf_data["oil"])
            notes = notes or pdf_data["notes"]
            description = description or pdf_data["description"]
        except requests.exceptions.RequestException as e:
            print(f"  Warning: could not download PDF {pdf_url}: {e}")
    if not alpha_from and not alpha_to and not beta_from and not beta_to:
        print(f"  Skipping {name} — no brewing data found (html_keys={list(brewing.keys())}, pdf_url={pdf_url!r})")
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
        description=description,
    )
    print(f"  Processed: {hop_entry.name} ({country}) — alpha {alpha_from}-{alpha_to}%")
    return hop_entry


def process_pdf_directly(pdf_url: str, anchor_text: str) -> Optional[HopEntry]:
    """
    Creates a HopEntry from a PDF spec sheet directly (used when no hop page exists).
    The hop name is derived from the anchor text or filename.
    """
    # Always derive name from filename: catalog PDFs all have anchor "Download Specs"
    # which is useless as a hop name.
    name = hop_name_from_pdf_filename(pdf_url)
    if not name:
        return None

    try:
        pdf_resp = requests.get(pdf_url, headers=HEADERS, timeout=PDF_TIMEOUT)
        pdf_resp.raise_for_status()
        pdf_data = parse_pdf_data(pdf_resp.content)
    except requests.exceptions.RequestException as e:
        print(f"  Warning: could not download PDF {pdf_url}: {e}")
        return None

    alpha_from, alpha_to = parse_range(pdf_data["alpha"])
    beta_from, beta_to = parse_range(pdf_data["beta"])
    co_h_from, co_h_to = parse_range(pdf_data["cohumulone"])
    oil_from, oil_to = parse_range(pdf_data["oil"])

    if not alpha_from and not beta_from:
        print(f"  Skipping PDF {name} — no brewing data extracted from PDF")
        return None

    hop_entry = HopEntry(
        name=name,
        country="USA",  # default; PDFs rarely state country
        source="John I. Haas",
        href=pdf_url,
        alpha_from=alpha_from,
        alpha_to=alpha_to,
        beta_from=beta_from,
        beta_to=beta_to,
        oil_from=oil_from,
        oil_to=oil_to,
        co_h_from=co_h_from,
        co_h_to=co_h_to,
        notes=pdf_data["notes"],
        description=pdf_data["description"],
    )
    print(f"  Processed (PDF): {hop_entry.name} — alpha {alpha_from}-{alpha_to}%")
    return hop_entry


def scrape(save: bool = False) -> List[HopEntry]:
    """Main function to scrape all hops from John I. Haas."""
    pdf_links, hop_page_links = collect_catalog_links()

    # Track which PDFs get consumed by hop page processing
    processed_pdf_urls: Set[str] = set()
    hop_entries: List[HopEntry] = []

    # Phase 1: process each root-level hop variety page (HTML + PDF)
    if hop_page_links:
        print(f"  Processing {len(hop_page_links)} hop variety pages...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(process_hop_page, url): url for url in hop_page_links}
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result:
                    hop_entries.append(result)
    else:
        print("  No root-level hop variety pages found; falling back to PDF-only mode.")

    # Phase 2: process any PDFs not already covered by hop pages.
    # `processed_pdf_urls` tracks PDFs consumed during Phase 1.  Because hop variety
    # pages each download their own PDF internally, we approximate the set by skipping
    # PDFs whose derived filename-name matches a Phase 1 hop name.
    phase1_names = {e.name.lower() for e in hop_entries}
    remaining_pdfs = {url: anchor for url, anchor in pdf_links.items()
                      if url not in processed_pdf_urls}
    if remaining_pdfs:
        print(f"  Processing {len(remaining_pdfs)} additional PDFs directly...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(process_pdf_directly, url, anchor): url
                for url, anchor in remaining_pdfs.items()
            }
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result and result.name.lower() not in phase1_names:
                    hop_entries.append(result)
                    phase1_names.add(result.name.lower())

    print(f"\nJohn I. Haas: successfully scraped {len(hop_entries)} hops "
          f"({len(hop_page_links)} pages + {len(remaining_pdfs)} PDFs attempted).")

    if save:
        save_hop_entries(hop_entries, "data/johnihaas.json")

    return hop_entries


def main():
    scrape(save=True)


if __name__ == "__main__":
    main()
