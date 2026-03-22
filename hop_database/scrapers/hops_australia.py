# hop_database/scrapers/hops_australia.py

"""
Scraper for Hop Products Australia (hops.com.au)

Extracts hop data from the main listing page, individual hop pages,
and PDF technical data sheets (for sensory analysis).
"""

import io
import re
import time
from typing import Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

from ..models.hop_model import HopEntry, save_hop_entries

BASE_URL = "https://www.hops.com.au"
HOPS_LISTING_URL = "https://www.hops.com.au/hops/"

PAGE_TIMEOUT = 90   # seconds — site is slow
PDF_TIMEOUT = 120   # seconds — PDFs can be large

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
}


def _get_with_retry(url: str, timeout: int = PAGE_TIMEOUT, retries: int = 3) -> requests.Response:
    """GET request with simple retry + backoff for slow/flaky servers."""
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=HEADERS, timeout=timeout)
            response.raise_for_status()
            return response
        except requests.exceptions.Timeout:
            if attempt < retries - 1:
                wait = 2 ** attempt  # 1s, 2s, 4s
                print(f"  Timeout fetching {url}, retrying in {wait}s ({attempt+1}/{retries})...")
                time.sleep(wait)
            else:
                raise
        except requests.exceptions.RequestException:
            raise
    raise RuntimeError(f"Failed to fetch {url} after {retries} attempts")


def _normalize_hop_url(href: str) -> str:
    """Normalize a hops.com.au URL to use www and trailing slash."""
    href = href.rstrip("/")
    href = re.sub(r"^https?://hops\.com\.au", BASE_URL, href, flags=re.I)
    return href + "/"


def _is_on_domain(href: str) -> bool:
    """True if href belongs to hops.com.au (with or without www)."""
    return bool(re.match(r"^https?://(?:www\.)?hops\.com\.au/", href, re.I))


def get_hop_links(listing_url: str = HOPS_LISTING_URL) -> List[str]:
    """Fetch the main hop listing page and return all individual hop page URLs."""
    print(f"Fetching hop listing from {listing_url} ...")
    try:
        response = _get_with_retry(listing_url, timeout=PAGE_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        print(f"Error fetching listing page: {exc}")
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    hop_links: List[str] = []
    seen: set = set()

    def _add(href: str) -> None:
        norm = _normalize_hop_url(href)
        if norm not in seen:
            seen.add(norm)
            hop_links.append(norm)

    # Strategy 1: Classic WordPress — h2/h3 with entry-title or post-title class
    candidates = (
        soup.find_all("h2", class_=re.compile(r"entry-title|post-title", re.I))
        or soup.find_all("h3", class_=re.compile(r"entry-title|post-title", re.I))
        or []
    )
    for heading in candidates:
        a_tag = heading.find("a", href=True)
        if a_tag:
            _add(a_tag["href"])

    # Strategy 2: Gutenberg block theme — wp-block-post-title headings
    if not hop_links:
        for heading in soup.find_all(
            ["h2", "h3"], class_=re.compile(r"wp-block-post-title", re.I)
        ):
            a_tag = heading.find("a", href=True)
            if a_tag:
                _add(a_tag["href"])

    # Strategy 3: Any link whose path matches /hops/<slug>/ (handles www/non-www,
    # relative and absolute hrefs, and any theme)
    if not hop_links:
        hop_slug_re = re.compile(
            r"^https?://(?:www\.)?hops\.com\.au/hops/([^/]+)/?$", re.I
        )
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.startswith("/"):
                href = BASE_URL + href
            if hop_slug_re.match(href):
                _add(href)

    # Strategy 4: WordPress REST API — works even when the page is JS-rendered
    if not hop_links:
        try:
            api_url = BASE_URL + "/wp-json/wp/v2/posts?per_page=100&_fields=link"
            api_resp = requests.get(api_url, headers=HEADERS, timeout=PAGE_TIMEOUT)
            if api_resp.status_code == 200:
                posts = api_resp.json()
                hop_slug_re = re.compile(r"/hops/[^/]+/?$", re.I)
                for post in posts:
                    link = post.get("link", "")
                    if hop_slug_re.search(link):
                        _add(link)
                if hop_links:
                    print(f"  Found {len(hop_links)} hop links via WordPress REST API")
        except Exception as exc:
            print(f"  Warning: WP REST API fallback failed: {exc}")

    # Strategy 5: Broad on-domain fallback — catches any remaining link patterns
    # Uses flexible domain matching (www or non-www) and handles relative hrefs
    if not hop_links:
        listing_path = HOPS_LISTING_URL.rstrip("/")
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.startswith("/"):
                href = BASE_URL + href
            href_norm = href.rstrip("/")
            if (
                _is_on_domain(href_norm)
                and href_norm != BASE_URL.rstrip("/")
                and href_norm != listing_path
                and not re.search(r"\.(pdf|png|jpg|css|js)$", href_norm, re.I)
                and "/wp-" not in href_norm
                and "/#" not in href_norm
                and href_norm not in seen
            ):
                seen.add(href_norm)
                hop_links.append(href_norm + "/")

    print(f"Found {len(hop_links)} hop links.")
    return hop_links


def parse_brewing_values(soup: BeautifulSoup) -> Dict[str, str]:
    """Extract essential brewing values from the hop page HTML."""
    values: Dict[str, str] = {}

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
    """Parse a string like '12.5 - 14.5%' into (from_val, to_val) strings."""
    if not text:
        return "", ""
    text = text.strip()
    text = re.sub(r"[%a-zA-Z/]", "", text).strip()
    text = re.sub(r"\s*[–—]\s*", "-", text)
    if "-" in text:
        parts = [p.strip() for p in text.split("-", 1)]
        from_val = re.sub(r"[^0-9.]", "", parts[0])
        to_val = re.sub(r"[^0-9.]", "", parts[1])
        return from_val, to_val
    val = re.sub(r"[^0-9.]", "", text)
    return val, val


def find_pdf_url(soup: BeautifulSoup, page_url: str) -> Optional[str]:
    """Look for a PDF technical data sheet link on the hop page."""
    for a_tag in soup.find_all("a", href=re.compile(r"\.pdf$", re.I)):
        href = a_tag["href"]
        if href.startswith("http"):
            return href
        return BASE_URL.rstrip("/") + "/" + href.lstrip("/")

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

    HPA PDFs include a "Beer sensory" radar chart and analytical data.
    Tries multiple extraction strategies using pdfplumber.
    """
    sensory: Dict[str, float] = {}

    try:
        import pdfplumber
    except ImportError:
        print("  Warning: pdfplumber not installed — skipping PDF sensory extraction.")
        return sensory

    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                # Strategy 1: Try table extraction
                tables = page.extract_tables() or []
                for table in tables:
                    for row in (table or []):
                        if not row:
                            continue
                        cells = [str(c).strip() if c else "" for c in row]
                        if len(cells) >= 2:
                            label = cells[0]
                            score_str = cells[-1]
                            mapped = _map_sensory_label(label)
                            if mapped:
                                score = _parse_score(score_str)
                                if score is not None:
                                    sensory[mapped] = max(sensory.get(mapped, 0.0), score)

                # Strategy 2: Extract text and parse labeled sections
                text = page.extract_text() or ""
                lines = text.splitlines()
                in_sensory = False
                for line in lines:
                    if re.search(r"beer\s+sensory|sensory\s+anal", line, re.I):
                        in_sensory = True
                        continue
                    if in_sensory and re.search(
                        r"(oil\s+compos|usage|brewing\s+val|storage|analytical|raw\s+hop)", line, re.I
                    ):
                        in_sensory = False
                        continue

                    if not in_sensory:
                        continue

                    # Match "LabelName   5" or "Label Name: 5" or "LabelName 5.5"
                    match = re.match(
                        r"^([A-Za-z][A-Za-z\s/&]+?)\s{2,}(\d+(?:\.\d+)?)\s*$", line
                    )
                    if not match:
                        match = re.match(
                            r"^([A-Za-z][A-Za-z\s/&]+?)\s*[:\-–]\s*(\d+(?:\.\d+)?)\s*$",
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

                # Strategy 3: Try extracting words with bounding boxes to correlate
                # labels near numeric values (for charts where values appear near labels)
                if not sensory:
                    try:
                        words = page.extract_words(x_tolerance=5, y_tolerance=5)
                        _extract_sensory_from_words(words, sensory)
                    except Exception:
                        pass

    except Exception as exc:
        print(f"  Warning: could not parse PDF for sensory data: {exc}")

    return sensory


def _extract_sensory_from_words(words: list, sensory: Dict[str, float]) -> None:
    """
    Try to correlate text labels and numeric values from word bounding boxes.
    Used as a fallback when structured text extraction fails.
    """
    # Group words by approximate Y position (same line)
    lines_by_y: Dict[int, list] = {}
    for word in words:
        y_key = round(float(word.get("top", 0)) / 5) * 5
        lines_by_y.setdefault(y_key, []).append(word)

    for y_key in sorted(lines_by_y.keys()):
        line_words = sorted(lines_by_y[y_key], key=lambda w: float(w.get("x0", 0)))
        line_text = " ".join(w["text"] for w in line_words)

        # Look for lines like "Citrus 7" or "Tropical Fruit 8"
        match = re.match(
            r"^([A-Za-z][A-Za-z\s/&]+?)\s+(\d+(?:\.\d+)?)\s*$", line_text.strip()
        )
        if match:
            label = match.group(1).strip()
            score_str = match.group(2).strip()
            mapped = _map_sensory_label(label)
            if mapped:
                score = _parse_score(score_str)
                if score is not None:
                    sensory[mapped] = max(sensory.get(mapped, 0.0), score)


def parse_pdf_brewing_values(pdf_content: bytes) -> Dict[str, str]:
    """
    Extract analytical brewing values (alpha, beta, cohumulone, oil) from an HPA PDF.
    These appear as text in the 'Analytical data' section.
    """
    values: Dict[str, str] = {}

    try:
        import pdfplumber
    except ImportError:
        return values

    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                # Match patterns like "Alpha 7.0 - 8.6%" or "Alpha 7.0 – 8.6%"
                for pattern, key in [
                    (r"Alpha\s+([\d.\s\-–]+%?)", "alpha"),
                    (r"Beta\s+([\d.\s\-–]+%?)", "beta"),
                    (r"Cohumulone\s+([\d.\s\-–]+[%\w]*(?:\s+of\s+\S+)?)", "cohumulone"),
                    (r"Total\s+oil\s+([\d.\s\-–]+\w+/?\w*)", "oil"),
                ]:
                    m = re.search(pattern, text, re.I)
                    if m and key not in values:
                        values[key] = m.group(1).strip()
    except Exception as exc:
        print(f"  Warning: could not parse PDF for brewing values: {exc}")

    return values


# HPA sensory category names that appear in their PDFs → AROMA_MAPPINGS keys
_HPA_SENSORY_KEYS = [
    "Citrus", "Tropical", "Tropical Fruit", "Stone Fruit", "Floral",
    "Herbal", "Earthy", "Grassy", "Resinous", "Pine", "Spicy", "Spice",
    "Berry", "Passionfruit", "Peach", "Mango", "Lemon", "Orange", "Lime", "Pineapple",
]


def _map_sensory_label(label: str) -> Optional[str]:
    """Map a raw PDF sensory label to the matching australianhops AROMA_MAPPINGS key."""
    label = label.strip()
    for key in _HPA_SENSORY_KEYS:
        if label.lower() == key.lower():
            return key
    for key in _HPA_SENSORY_KEYS:
        if key.lower() in label.lower() or label.lower() in key.lower():
            return key
    return None


def _parse_score(text: str) -> Optional[float]:
    """Extract a numeric score from a string. Returns None if not possible."""
    m = re.search(r"\d+(?:\.\d+)?", text or "")
    if m:
        return float(m.group(0))
    return None


def parse_description(soup: BeautifulSoup) -> str:
    """Extract the main descriptive text about the hop variety from the page."""
    # Try to find the main content area
    main = (
        soup.find("main")
        or soup.find("div", class_=re.compile(r"entry-content|post-content|content", re.I))
        or soup.find("article")
    )
    if not main:
        main = soup

    paragraphs = []
    for p_tag in main.find_all("p"):
        text = p_tag.get_text(strip=True)
        # Skip very short paragraphs, or ones that look like metadata
        if len(text) > 40 and not re.match(
            r"^(alpha|beta|cohumulone|total oil|oil|storage|copyright|©)", text, re.I
        ):
            paragraphs.append(text)
            if len(" ".join(paragraphs)) > 500:
                break

    return " ".join(paragraphs).strip()


def parse_aroma_notes(soup: BeautifulSoup) -> List[str]:
    """Extract free-text aroma/flavour descriptor notes from the hop page."""
    notes: List[str] = []

    for selector in (re.compile(r"aroma|flavou?r|tasting|descriptor", re.I),):
        for elem in soup.find_all(["p", "div", "ul", "li"], class_=selector):
            text = elem.get_text(", ", strip=True)
            if text:
                notes.extend([n.strip() for n in re.split(r"[,;]", text) if n.strip()])

    if not notes:
        main = soup.find("main") or soup.find(
            "div", class_=re.compile(r"content|entry", re.I)
        )
        if main:
            for p_tag in main.find_all("p"):
                text = p_tag.get_text(strip=True)
                parts = [t.strip() for t in re.split(r"[,;]", text) if t.strip()]
                if 2 <= len(parts) <= 15 and all(
                    re.match(r"^[a-zA-Z\s\-/]+$", p) for p in parts
                ):
                    notes.extend(parts)
                    break

    return [n.lower() for n in notes if n]


def process_hop_page(hop_url: str) -> Optional[HopEntry]:
    """Fetch a single hop page, parse all HTML data, and return a partial HopEntry.
    PDF download is handled separately in scrape() to allow rate limiting.
    Returns a HopEntry with pdf_url stored in additional_properties for later use."""
    try:
        response = _get_with_retry(hop_url, timeout=PAGE_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        print(f"  Error fetching {hop_url}: {exc}")
        return None

    soup = BeautifulSoup(response.content, "html.parser")

    h1 = soup.find("h1")
    name = h1.get_text(strip=True) if h1 else ""
    if not name:
        slug = hop_url.rstrip("/").rsplit("/", 1)[-1]
        name = slug.replace("-", " ").title()

    bv = parse_brewing_values(soup)
    alpha_from, alpha_to = parse_range(bv.get("alpha", ""))
    beta_from, beta_to = parse_range(bv.get("beta", ""))
    coh_from, coh_to = parse_range(bv.get("cohumulone", ""))
    oil_from, oil_to = parse_range(bv.get("oil", ""))

    description = parse_description(soup)
    notes = parse_aroma_notes(soup)
    pdf_url = find_pdf_url(soup, hop_url)

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
        description=description,
        additional_properties={"_pdf_url": pdf_url or ""},
    )
    print(f"  Page loaded: {name} — pdf: {pdf_url or 'none'}")
    return hop_entry


def enrich_with_pdf(hop_entry: HopEntry) -> None:
    """Download and parse the PDF for a hop entry, updating it in place."""
    pdf_url = hop_entry.additional_properties.pop("_pdf_url", "")
    if not pdf_url:
        return

    try:
        pdf_response = _get_with_retry(pdf_url, timeout=PDF_TIMEOUT)
        pdf_bytes = pdf_response.content
        print(f"  PDF downloaded: {pdf_url}")
    except requests.exceptions.RequestException as exc:
        print(f"  Warning: could not download PDF {pdf_url}: {exc}")
        return

    sensory_data = parse_pdf_sensory(pdf_bytes)
    hop_entry.set_standardized_aromas("australianhops", sensory_data)

    # Fill in brewing values from PDF if HTML page had none
    if not hop_entry.alpha_from:
        pdf_bv = parse_pdf_brewing_values(pdf_bytes)
        if pdf_bv.get("alpha"):
            hop_entry.alpha_from, hop_entry.alpha_to = parse_range(pdf_bv["alpha"])
        if pdf_bv.get("beta"):
            hop_entry.beta_from, hop_entry.beta_to = parse_range(pdf_bv["beta"])
        if pdf_bv.get("cohumulone"):
            hop_entry.co_h_from, hop_entry.co_h_to = parse_range(pdf_bv["cohumulone"])
        if pdf_bv.get("oil"):
            hop_entry.oil_from, hop_entry.oil_to = parse_range(pdf_bv["oil"])


PDF_DELAY = 3  # seconds to wait between PDF downloads


def scrape(save: bool = False) -> List[HopEntry]:
    """
    Main entry point: scrape all hops from hops.com.au.

    Phase 1 — load the listing page and collect hop page URLs.
    Phase 2 — visit each hop page sequentially to parse HTML data and find PDF links.
    Phase 3 — download each PDF sequentially with a delay between requests,
               then parse sensory and brewing data from the PDF.

    Args:
        save: If True, save results to data/hops_australia.json.

    Returns:
        List of HopEntry objects.
    """
    # Phase 1: listing page
    hop_links = get_hop_links()
    if not hop_links:
        print("No hop links found for hops.com.au — skipping.")
        return []

    # Phase 2: load each hop page sequentially
    print(f"\nLoading {len(hop_links)} hop pages sequentially...")
    hop_entries: List[HopEntry] = []
    for i, url in enumerate(hop_links, 1):
        print(f"  [{i}/{len(hop_links)}] {url}")
        entry = process_hop_page(url)
        if entry:
            hop_entries.append(entry)

    print(f"\nLoaded {len(hop_entries)} hop pages. Now downloading PDFs...")

    # Phase 3: download PDFs one at a time with a delay between each
    for i, entry in enumerate(hop_entries):
        if entry.additional_properties.get("_pdf_url"):
            if i > 0:
                time.sleep(PDF_DELAY)
            enrich_with_pdf(entry)

    print(f"\nHop Products Australia: scraped {len(hop_entries)} of {len(hop_links)} hops.")

    if save:
        save_hop_entries(hop_entries, "data/hops_australia.json")

    return hop_entries


def main():
    scrape(save=True)


if __name__ == "__main__":
    main()
