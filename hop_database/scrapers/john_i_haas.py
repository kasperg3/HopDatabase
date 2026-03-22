"""
John I. Haas Hop Scraper

Scrapes hop data from https://www.johnihaas.com/products/hops/
Individual hop pages live at /variety/{slug} and each links to a PDF spec sheet.
Brewing values and aroma data are parsed from both the page HTML and the PDF.
"""

import io
import re
import time
import concurrent.futures
from typing import Dict, Optional, Tuple, List

import requests
from bs4 import BeautifulSoup

from ..models.hop_model import HopEntry, save_hop_entries

BASE_URL = "https://www.johnihaas.com"
CATALOG_URL = "https://www.johnihaas.com/products/hops/"

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


def get_hop_links(catalog_url: str = CATALOG_URL) -> List[str]:
    """Fetches the catalog page and returns all individual hop variety page URLs."""
    try:
        response = requests.get(catalog_url, headers=HEADERS, timeout=PAGE_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        hop_links = set()
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            # Individual hop pages are at /variety/{slug}
            if re.match(r"^(https?://www\.johnihaas\.com)?/variety/[^/]+/?$", href):
                full_url = href if href.startswith("http") else BASE_URL + href
                hop_links.add(full_url.rstrip("/"))

        print(f"Found {len(hop_links)} unique hop links on John I. Haas.")
        return list(hop_links)

    except requests.exceptions.RequestException as e:
        print(f"Error fetching John I. Haas catalog: {e}")
        return []


def find_pdf_url(soup: BeautifulSoup) -> Optional[str]:
    """Find the PDF spec sheet link on a hop variety page."""
    # Direct .pdf links
    for a_tag in soup.find_all("a", href=re.compile(r"\.pdf$", re.I)):
        href = a_tag["href"]
        return href if href.startswith("http") else BASE_URL + href

    # Links labelled as spec sheet / download
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

            # Brewing values — match "Alpha 5.5 - 8.5%" style lines
            for pattern, key in [
                (r"(?i)alpha\s*(?:acid[s]?)?\s*[:\-]?\s*([\d.\s\-–]+%?)", "alpha"),
                (r"(?i)beta\s*(?:acid[s]?)?\s*[:\-]?\s*([\d.\s\-–]+%?)", "beta"),
                (r"(?i)co-?h(?:umulone)?\s*[:\-]?\s*([\d.\s\-–]+%?)", "cohumulone"),
                (r"(?i)total\s+oil\s*[:\-]?\s*([\d.\s\-–]+\w*/?\w*)", "oil"),
                (r"(?i)oil\s+content\s*[:\-]?\s*([\d.\s\-–]+\w*/?\w*)", "oil"),
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


def process_hop_page(hop_url: str) -> Optional[HopEntry]:
    """Fetches a hop variety page, finds its PDF, and returns a HopEntry."""
    try:
        response = requests.get(hop_url, headers=HEADERS, timeout=PAGE_TIMEOUT)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
    except requests.exceptions.RequestException as e:
        print(f"  Error fetching {hop_url}: {e}")
        return None

    # Name
    h1 = soup.find("h1")
    name = h1.get_text(strip=True) if h1 else hop_url.rstrip("/").split("/")[-1].replace("-", " ").title()

    # Country from page text
    country = "USA"
    page_text = soup.get_text(" ", strip=True).lower()
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
        if keyword in page_text:
            country = country_name
            break

    # Brewing values from HTML
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

    alpha_from, alpha_to = parse_range(brewing.get("alpha", brewing.get("alpha acids", "")))
    beta_from, beta_to = parse_range(brewing.get("beta", brewing.get("beta acids", "")))
    co_h_from, co_h_to = parse_range(brewing.get("cohumulone", brewing.get("co-h", "")))
    oil_from, oil_to = parse_range(brewing.get("oil", brewing.get("total oil", "")))

    # Notes and description from HTML
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

    # PDF — find link and download
    pdf_url = find_pdf_url(soup)
    if pdf_url:
        try:
            pdf_resp = requests.get(pdf_url, headers=HEADERS, timeout=PDF_TIMEOUT)
            pdf_resp.raise_for_status()
            pdf_data = parse_pdf_data(pdf_resp.content)

            # Fill in missing brewing values from PDF
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
        print(f"  Skipping {name} — no brewing data found")
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


def scrape(save: bool = False) -> List[HopEntry]:
    """Main function to scrape all hops from John I. Haas."""
    hop_links = get_hop_links(CATALOG_URL)

    if not hop_links:
        print("No hop links found for John I. Haas.")
        return []

    hop_entries = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
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
