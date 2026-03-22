# hop_database/scrapers/hops_australia.py

"""
Scraper for Hop Products Australia (hops.com.au)

Extracts hop data from the main listing page, individual hop pages,
and PDF technical data sheets (for sensory analysis).
"""

import concurrent.futures
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


def collect_listing_links(listing_url: str = HOPS_LISTING_URL) -> Dict[str, Optional[str]]:
    """
    Fetch the hop listing page and return a {hop_url: pdf_url_or_None} mapping.

    Scans each hop card/article for its page link and data-sheet PDF link in one
    pass.  Falls back to slug-based matching when container pairing fails, and
    finally falls back to the existing multi-strategy approaches for sites where
    the listing page has an unusual structure.
    """
    _HOP_RE = re.compile(
        r"^https?://(?:www\.)?hops\.com\.au/hops/([^/]+)/?$", re.I
    )
    _EXCLUDE_PDF = re.compile(r"/legal/|privacy|policy|terms|disclaimer", re.I)
    _PDF_RE = re.compile(r"\.pdf", re.I)

    print(f"Fetching hop listing from {listing_url} ...")
    try:
        response = _get_with_retry(listing_url, timeout=PAGE_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        print(f"Error fetching listing page: {exc}")
        return {}

    soup = BeautifulSoup(response.content, "html.parser")

    def _abs(href: str) -> str:
        href = re.sub(r"^https?://hops\.com\.au", BASE_URL, href, flags=re.I)
        if href.startswith("/"):
            return BASE_URL + href
        return href

    result: Dict[str, Optional[str]] = {}   # hop_url → pdf_url

    # --- Strategy 1-3: container-based pairing ---
    # Each hop card (article or common WP post div) contains both its page link
    # and its PDF data-sheet link; find them together.
    containers = soup.find_all("article") or soup.find_all(
        "div", class_=re.compile(r"post|entry|card|hops?-item", re.I)
    )
    for container in containers:
        hop_url: Optional[str] = None
        for a_tag in container.find_all("a", href=True):
            href = _abs(a_tag["href"])
            if _HOP_RE.match(href):
                hop_url = _normalize_hop_url(href)
                break
        if not hop_url:
            continue
        pdf_url: Optional[str] = None
        for a_tag in container.find_all("a", href=_PDF_RE):
            href = _abs(a_tag["href"])
            if not _EXCLUDE_PDF.search(href):
                pdf_url = href
                break
        result.setdefault(hop_url, pdf_url)

    # Strategy 4: collect all hop-path links if containers found nothing
    if not result:
        for a_tag in soup.find_all("a", href=True):
            href = _abs(a_tag["href"])
            if href.startswith("/"):
                href = BASE_URL + href
            if _HOP_RE.match(href):
                result.setdefault(_normalize_hop_url(href), None)

    # Strategy 5: WordPress REST API
    if not result:
        try:
            api_url = BASE_URL + "/wp-json/wp/v2/posts?per_page=100&_fields=link"
            api_resp = requests.get(api_url, headers=HEADERS, timeout=PAGE_TIMEOUT)
            if api_resp.status_code == 200:
                hop_slug_re = re.compile(r"/hops/[^/]+/?$", re.I)
                for post in api_resp.json():
                    link = post.get("link", "")
                    if hop_slug_re.search(link):
                        result.setdefault(_normalize_hop_url(link), None)
                if result:
                    print(f"  Found {len(result)} hop links via WordPress REST API")
        except Exception as exc:
            print(f"  Warning: WP REST API fallback failed: {exc}")

    # Strategy 6: broad on-domain fallback
    if not result:
        listing_path = HOPS_LISTING_URL.rstrip("/")
        seen: set = set()
        for a_tag in soup.find_all("a", href=True):
            href = _abs(a_tag["href"])
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
                result.setdefault(href_norm + "/", None)

    # Slug-based PDF matching for entries without a paired PDF
    # Collect all non-excluded PDFs from the listing page
    all_pdfs = [
        _abs(a["href"])
        for a in soup.find_all("a", href=_PDF_RE)
        if not _EXCLUDE_PDF.search(a["href"])
    ]
    if all_pdfs:
        for hop_url, existing_pdf in list(result.items()):
            if existing_pdf:
                continue
            slug = hop_url.rstrip("/").rsplit("/", 1)[-1]
            slug_norm = re.sub(r"[-\s]", "", slug).lower()
            for pdf in all_pdfs:
                pdf_filename = re.sub(r"[-\s_]", "", pdf.rsplit("/", 1)[-1]).lower()
                if slug_norm in pdf_filename:
                    result[hop_url] = pdf
                    break

    n_with_pdf = sum(1 for v in result.values() if v)
    print(f"Found {len(result)} hop links ({n_with_pdf} with PDFs from listing page).")
    return result


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


def _find_pdf_via_wp_api(hop_slug: str) -> Optional[str]:
    """Query the WordPress REST API for PDF attachments matching the hop slug.
    Used as a fallback when the hop page doesn't link its spec sheet directly."""
    _EXCLUDE = re.compile(r"/legal/|privacy|policy|terms|disclaimer", re.I)
    try:
        api_url = (
            f"{BASE_URL}/wp-json/wp/v2/media"
            f"?search={hop_slug}&mime_type=application/pdf&per_page=10"
        )
        resp = requests.get(api_url, headers=HEADERS, timeout=PAGE_TIMEOUT)
        if resp.status_code == 200:
            for item in resp.json():
                url = item.get("source_url", "")
                if url.lower().endswith(".pdf") and not _EXCLUDE.search(url):
                    return url
    except Exception:
        pass
    return None


def find_pdf_url(soup: BeautifulSoup, page_url: str) -> Optional[str]:
    """Look for a PDF technical data sheet link on the hop page."""
    _EXCLUDE = re.compile(r"/legal/|privacy|policy|terms|disclaimer", re.I)
    _PREFER = re.compile(r"spec|data.?sheet|technical|analytical|download", re.I)

    def _abs(href: str) -> str:
        if href.startswith("http"):
            return href
        return BASE_URL.rstrip("/") + "/" + href.lstrip("/")

    candidates: List[str] = []

    for a_tag in soup.find_all("a", href=re.compile(r"\.pdf", re.I)):
        href = a_tag["href"]
        if not _EXCLUDE.search(href):
            candidates.append(_abs(href))

    if not candidates:
        for a_tag in soup.find_all("a", href=True):
            label = a_tag.get_text(strip=True).lower()
            if any(kw in label for kw in ("data sheet", "technical", "download", "pdf")):
                href = a_tag["href"]
                if not _EXCLUDE.search(href) and (href.endswith(".pdf") or "pdf" in href.lower()):
                    candidates.append(_abs(href))

    # Prefer URLs that look like spec/analytical sheets over generic PDFs
    preferred = [u for u in candidates if _PREFER.search(u)]
    return preferred[0] if preferred else (candidates[0] if candidates else None)


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


def process_hop_page(hop_url: str, known_pdf_url: Optional[str] = None) -> Optional[HopEntry]:
    """Fetch a hop page and its PDF spec sheet, merge both sources into a HopEntry.

    HTML provides: name, country, description, aroma notes, and sometimes brewing values.
    PDF provides: authoritative brewing values (alpha/beta/cohumulone/oil) and sensory scores.
    When both sources have a brewing value the PDF wins (it is the official spec sheet).
    PDF discovery order: known_pdf_url (from listing page) → page link → WP REST API.
    """
    try:
        response = _get_with_retry(hop_url, timeout=PAGE_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        print(f"  Error fetching {hop_url}: {exc}")
        return None

    soup = BeautifulSoup(response.content, "html.parser")
    hop_slug = hop_url.rstrip("/").rsplit("/", 1)[-1]

    # Name from <h1>, fallback to slug
    h1 = soup.find("h1")
    name = h1.get_text(strip=True) if h1 else hop_slug.replace("-", " ").title()

    # Brewing values from HTML (tables / definition lists / inline text)
    bv = parse_brewing_values(soup)
    alpha_from, alpha_to = parse_range(bv.get("alpha", ""))
    beta_from, beta_to = parse_range(bv.get("beta", ""))
    coh_from, coh_to = parse_range(bv.get("cohumulone", ""))
    oil_from, oil_to = parse_range(bv.get("oil", ""))

    description = parse_description(soup)
    notes = parse_aroma_notes(soup)

    # PDF discovery: listing-page URL first, then page link, then WP REST API
    pdf_source = "listing" if known_pdf_url else None
    pdf_url = known_pdf_url
    if not pdf_url:
        pdf_url = find_pdf_url(soup, hop_url)
        if pdf_url:
            pdf_source = "page-link"
    if not pdf_url:
        pdf_url = _find_pdf_via_wp_api(hop_slug)
        if pdf_url:
            pdf_source = "wp-api"

    print(f"  [DBG] {hop_slug}: pdf_source={pdf_source!r} pdf_url={pdf_url!r}")
    print(f"  [DBG] {hop_slug}: html_bv={bv!r}")

    # PDF data — brewing values from PDF override HTML; sensory always from PDF
    pdf_bytes: Optional[bytes] = None
    if pdf_url:
        try:
            pdf_resp = _get_with_retry(pdf_url, timeout=PDF_TIMEOUT)
            pdf_bytes = pdf_resp.content
            print(f"  PDF downloaded: {pdf_url}")

            pdf_bv = parse_pdf_brewing_values(pdf_bytes)
            print(f"  [DBG] {hop_slug}: pdf_bv={pdf_bv!r}")
            if pdf_bv.get("alpha"):
                alpha_from, alpha_to = parse_range(pdf_bv["alpha"])
            if pdf_bv.get("beta"):
                beta_from, beta_to = parse_range(pdf_bv["beta"])
            if pdf_bv.get("cohumulone"):
                coh_from, coh_to = parse_range(pdf_bv["cohumulone"])
            if pdf_bv.get("oil"):
                oil_from, oil_to = parse_range(pdf_bv["oil"])
        except requests.exceptions.RequestException as exc:
            print(f"  Warning: could not download PDF {pdf_url}: {exc}")
            pdf_bytes = None

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
    )

    if pdf_bytes:
        sensory_data = parse_pdf_sensory(pdf_bytes)
        hop_entry.set_standardized_aromas("australianhops", sensory_data)

    print(
        f"  [DBG] {hop_slug}: final alpha={alpha_from}-{alpha_to} "
        f"beta={beta_from}-{beta_to} coh={coh_from}-{coh_to} oil={oil_from}-{oil_to}"
    )
    print(f"  Page loaded: {name} — pdf: {pdf_url or 'none'}")
    return hop_entry


MAX_WORKERS = 5  # concurrent threads for page and PDF fetches


def scrape(save: bool = False) -> List[HopEntry]:
    """
    Main entry point: scrape all hops from hops.com.au.

    Phase 1 — load the listing page and collect hop page URLs.
    Phase 2 — for each hop page concurrently: fetch HTML, find PDF (page link or
               WP REST API), download PDF, merge both sources into a HopEntry.

    Args:
        save: If True, save results to data/hops_australia.json.

    Returns:
        List of HopEntry objects.
    """
    # Phase 1: listing page — collect hop URLs and PDF links together
    listing = collect_listing_links()
    if not listing:
        print("No hop links found for hops.com.au — skipping.")
        return []

    # Phase 2: fetch + parse hop pages concurrently (HTML and PDF merged)
    print(f"\nProcessing {len(listing)} hop pages concurrently...")
    hop_entries: List[HopEntry] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_hop_page, url, pdf_url): url
            for url, pdf_url in listing.items()
        }
        for future in concurrent.futures.as_completed(futures):
            entry = future.result()
            if entry:
                hop_entries.append(entry)

    # Filter out non-hop pages: a real hop entry has at least one numeric brewing value.
    kept, dropped = [], []
    for e in hop_entries:
        if any([e.alpha_from, e.alpha_to, e.beta_from, e.beta_to, e.oil_from, e.co_h_from]):
            kept.append(e)
        else:
            dropped.append(e)
    if dropped:
        print(f"  [DBG] Dropped {len(dropped)} entries with no brewing data:")
        for e in dropped:
            print(f"    - {e.name!r} ({e.href})")
    hop_entries = kept

    print(f"\nHop Products Australia: scraped {len(hop_entries)} of {len(listing)} hops.")

    if save:
        save_hop_entries(hop_entries, "data/hops_australia.json")

    return hop_entries


def main():
    scrape(save=True)


if __name__ == "__main__":
    main()
