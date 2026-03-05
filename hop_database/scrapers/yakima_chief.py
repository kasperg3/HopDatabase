from bs4 import BeautifulSoup
import requests as req
import math
import os
import re
import json

from ..models.hop_model import HopEntry, save_hop_entries

# Known product type keywords and their canonical names
PRODUCT_TYPE_PATTERNS = [
    (r'lupuln2|cryo\s*hops?|cryo\s*pellets?', 'LupuLN2® Cryo Hops®'),
    (r'lupomax', 'Lupomax®'),
    (r'incognito', 'Incognito®'),
    (r'whole\s*cone|cone', 'Whole Cone'),
    (r't-?90|pellets?', 'T-90 Pellets'),
]


def _parse_properties_table(table):
    """
    Parse a product-properties table and return a dict of brewing values.
    Returns None if the table cannot be parsed.
    """
    if not table:
        return None

    props = {}
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        try:
            key = cells[0].get_text().strip().rstrip(":").strip()
            value = cells[1].get_text().strip()
            if key:
                props[key] = value
        except Exception:
            continue

    if not props:
        return None

    def parse_range(value_str):
        """Parse a value range like '9.5-11.5%' into (from, to) strings."""
        if not value_str:
            return "", ""
        # Remove unit suffixes (%, mL/100g and similar) but preserve numbers and hyphens
        clean = re.sub(r'\s*(mL/100g|%)\s*', '', value_str, flags=re.IGNORECASE).strip()
        if '-' in clean:
            parts = clean.split('-', 1)
            return parts[0].strip(), parts[1].strip()
        val = re.sub(r'[^0-9.]', '', clean)
        return val, ""

    alpha_range = parse_range(props.get("Alpha", ""))
    beta_range = parse_range(props.get("Beta", ""))
    co_h_range = parse_range(props.get("CO_H", ""))
    oil_range = parse_range(props.get("Oil", ""))

    # Check we have at least alpha values
    if not alpha_range[0] and not alpha_range[1]:
        return None

    return {
        "alpha_from": alpha_range[0],
        "alpha_to": alpha_range[1],
        "beta_from": beta_range[0],
        "beta_to": beta_range[1],
        "oil_from": oil_range[0],
        "oil_to": oil_range[1],
        "co_h_from": co_h_range[0],
        "co_h_to": co_h_range[1],
    }


def _detect_product_type(text):
    """
    Detect product type from text using known patterns.
    Returns canonical product type name or None.
    """
    text_lower = text.lower()
    for pattern, canonical_name in PRODUCT_TYPE_PATTERNS:
        if re.search(pattern, text_lower):
            return canonical_name
    return None


def extract_product_variants(soup):
    """
    Extract product variants (T-90 Pellets, Whole Cone, LupuLN2, Lupomax, etc.)
    and their brewing values from a parsed individual hop page.

    Returns a list of dicts, each with:
      {"type": str, "alpha_from": str, "alpha_to": str, "beta_from": str,
       "beta_to": str, "oil_from": str, "oil_to": str, "co_h_from": str, "co_h_to": str}
    """
    variants = []

    # Strategy 1: Look for multiple product-properties tables, each preceded
    # by a heading or label that indicates the product form.
    prop_tables = soup.find_all("table", {"class": "product-properties"})
    if len(prop_tables) > 1:
        for table in prop_tables:
            # Look backwards in siblings/parents for a type heading
            product_type = None
            # Check previous siblings
            for sibling in table.previous_siblings:
                text = getattr(sibling, 'get_text', lambda: str(sibling))()
                text = text.strip()
                if text:
                    product_type = _detect_product_type(text)
                    if product_type:
                        break
            # Check the parent element heading
            if not product_type:
                parent = table.parent
                if parent:
                    heading = parent.find(['h1', 'h2', 'h3', 'h4', 'h5', 'strong'])
                    if heading:
                        product_type = _detect_product_type(heading.get_text())
            if not product_type:
                product_type = "T-90 Pellets"  # Default

            values = _parse_properties_table(table)
            if values:
                variant = {"type": product_type}
                variant.update(values)
                # Avoid duplicates by type
                if not any(v["type"] == product_type for v in variants):
                    variants.append(variant)

        if variants:
            return variants

    # Strategy 2: Look for product tabs or accordion sections
    # Try common tab/accordion selectors used by Magento and custom themes
    tab_selectors = [
        {"class": re.compile(r'hop-product(?:-form|-type|-tab)?', re.I)},
        {"class": re.compile(r'product-form(?:-tab|-section|-item)?', re.I)},
        {"class": re.compile(r'product-type(?:-tab|-section)?', re.I)},
        {"data-product-type": True},
        {"data-form-type": True},
    ]

    for selector in tab_selectors:
        sections = soup.find_all(True, selector)
        if sections:
            for section in sections:
                heading = section.find(['h1', 'h2', 'h3', 'h4', 'h5', 'strong', 'span'])
                product_type = None
                if heading:
                    product_type = _detect_product_type(heading.get_text())
                if not product_type:
                    # Try data attributes
                    for attr in ['data-product-type', 'data-form-type', 'data-tab', 'title']:
                        val = section.get(attr, '')
                        if val:
                            product_type = _detect_product_type(val)
                            if product_type:
                                break
                if not product_type:
                    product_type = _detect_product_type(section.get_text())

                table = section.find("table", {"class": "product-properties"})
                values = _parse_properties_table(table)
                if values and product_type:
                    variant = {"type": product_type}
                    variant.update(values)
                    if not any(v["type"] == product_type for v in variants):
                        variants.append(variant)

            if variants:
                return variants

    # Strategy 3: Look for product configuration JSON in Magento-style script tags
    for script_tag in soup.find_all("script"):
        script_text = script_tag.string or ""
        if not script_text:
            continue

        # Try to find JSON objects containing product variant data
        json_matches = re.findall(
            r'"product[_\s-]?(?:forms?|variants?|types?|options?)"\s*:\s*(\[.*?\])',
            script_text,
            re.DOTALL | re.IGNORECASE
        )
        for match in json_matches:
            try:
                items = json.loads(match)
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    product_type = None
                    for key in ['type', 'form', 'name', 'label', 'title']:
                        val = item.get(key, '')
                        if val:
                            product_type = _detect_product_type(str(val)) or str(val)
                            break
                    if not product_type:
                        continue

                    def get_val(d, *keys):
                        for k in keys:
                            if k in d:
                                return str(d[k])
                        return ""

                    variant = {
                        "type": product_type,
                        "alpha_from": get_val(item, 'alpha_from', 'alphaFrom'),
                        "alpha_to": get_val(item, 'alpha_to', 'alphaTo'),
                        "beta_from": get_val(item, 'beta_from', 'betaFrom'),
                        "beta_to": get_val(item, 'beta_to', 'betaTo'),
                        "oil_from": get_val(item, 'oil_from', 'oilFrom'),
                        "oil_to": get_val(item, 'oil_to', 'oilTo'),
                        "co_h_from": get_val(item, 'co_h_from', 'cohFrom'),
                        "co_h_to": get_val(item, 'co_h_to', 'cohTo'),
                    }
                    if not any(v["type"] == product_type for v in variants):
                        variants.append(variant)
            except (json.JSONDecodeError, ValueError):
                continue

        if variants:
            return variants

    return variants


def extract_hop_page_data(hop_url):
    """
    Fetch an individual hop page and extract both sensory analysis data
    and product variant information.

    Returns:
        tuple: (sensory_data dict, product_variants list)
    """
    sensory_data = {}
    product_variants = []

    try:
        response = req.get(hop_url)
        soup = BeautifulSoup(response.text, "html.parser")

        # --- Sensory Analysis ---
        sensory_div = soup.find("div", {"class": "sensory-analysis"})
        if sensory_div:
            svg = sensory_div.find("svg")
            if svg:
                aroma_labels = []
                for text_elem in svg.find_all("text", {"class": "chart-label"}):
                    tspan_elements = text_elem.find_all("tspan")
                    if tspan_elements:
                        label_text = " ".join(
                            [tspan.get_text().strip() for tspan in tspan_elements]
                        )
                    else:
                        label_text = text_elem.get_text().strip()
                    aroma_labels.append(label_text)

                polygon = svg.find("polygon", {"class": "polygon-chart"})
                if polygon:
                    points_str = polygon.get("points", "")
                    points = []
                    for point in points_str.split():
                        if "," in point:
                            x, y = point.split(",")
                            points.append((float(x), float(y)))
                    sensory_data = convert_polygon_to_intensities(points, aroma_labels)

        # --- Product Variants ---
        product_variants = extract_product_variants(soup)

    except Exception as e:
        print(f"Error extracting hop page data from {hop_url}: {e}")

    return sensory_data, product_variants


def extract_sensory_analysis(hop_url):
    """
    Extract sensory analysis data from individual hop page.
    Returns a dictionary with aroma categories and their intensity values (0-5).
    """
    sensory_data, _ = extract_hop_page_data(hop_url)
    return sensory_data


def convert_polygon_to_intensities(points, aroma_labels):
    """
    Convert SVG polygon coordinates to intensity values on a 0-5 scale.

    The SVG uses a radar chart with center at (310, 310) and radius of 226.3 for 100%.
    Each ring represents 20% increments (5 rings total for 100%).
    """
    center_x, center_y = 310, 310
    max_radius = 226.3  # Maximum radius for 100%

    sensory_data = {}

    # Match polygon points to aroma labels
    for i, point in enumerate(points):
        if i >= len(aroma_labels):
            break

        x, y = point

        # Calculate distance from center
        distance = math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)

        # Convert distance to percentage (0-100%)
        percentage = min(100, (distance / max_radius) * 100)

        # Convert percentage to 0-5 scale (rounded to nearest integer)
        intensity = round(percentage / 20)  # 20% per intensity level
        intensity = max(0, min(5, intensity))  # Ensure it's within 0-5 range

        aroma_category = aroma_labels[i]
        sensory_data[aroma_category] = intensity

    return sensory_data
def process_name_and_country(name: str):
    """
    Determines the country of origin based on tags in the hop name
    and returns a cleaned name and the country.
    """
    country = ""
    cleaned_name = name

    if name.startswith("GR "):
        country = "Germany"
        cleaned_name = name[3:]
    elif "Hop Revolution" in name or "NZ" in name or "- nz hops" in name.lower():
        country = "New Zealand"
        # Remove all variants of "- nz hops" (case-insensitive, with optional spaces)
        cleaned_name = re.sub(r"(?i)\s*-\s*nz\s*hops\s*", "", name)
        cleaned_name = cleaned_name.replace("Hop Revolution", "").replace("NZ ", "").strip()
    elif name.startswith("CZ "):
        country = "Czech Republic"
        cleaned_name = name[3:]
    elif name.lower().endswith("- nz hops"):
        country = "New Zealand"
        cleaned_name = name[:-9].strip()

    cleaned_name = re.sub(r'\s*\(\w+\)$', '', cleaned_name)
    return cleaned_name.strip(), country

def scrape(url="https://www.yakimachief.com/commercial/hop-varieties.html?product_list_limit=all",save=False):
    r = req.get(url)
    html = r.text

    soup = BeautifulSoup(html, "html.parser")

    hop_data = soup.find_all("li", {"class": "item product product-item"})
    hop_entries = []
    total_hops = len(hop_data)
    print(f"Found {total_hops} hops to process...")

    import concurrent.futures

    def process_hop(i, hop):
        try:
            href = hop.find("a", {"class": "hop"})["href"]
            # Extract brewing values
            product_properties = hop.find("table", {"class": "product-properties"})

            # Aromas
            product_details = hop.find("div", {"class": "product-item-details-wrapper"})
            hop_aromas_notes = product_details.find("p", {"class": "product-sight"})
            if hop_aromas_notes is not None:
                hop_aromas_notes = hop_aromas_notes.contents[0].strip().split(", ")

            # Name
            # Some names may have hyphens or spaces; ensure the full name is captured
            name_elem = product_details.find("a")
            name = name_elem.get_text(strip=True) if name_elem else ""
            # name = product_details.find("a").contents[0].strip()

            properties_dict = {}

            for row in product_properties("tr"):
                contents = row.find_all("td")
                key = contents[0].contents[0].strip(":")
                value = contents[1].contents[0]
                properties_dict[key] = value

            alpha_range = properties_dict.get("Alpha", "").split("-")
            alpha_low = alpha_range[0].strip() if alpha_range else ""
            alpha_high = alpha_range[1].strip("%") if len(alpha_range) > 1 else ""

            beta_range = properties_dict.get("Beta", "").split("-")
            beta_low = beta_range[0].strip() if beta_range else ""
            beta_high = beta_range[1].strip("%") if len(beta_range) > 1 else ""

            co_h_range = properties_dict.get("CO_H", "").split("-")
            co_h_low = co_h_range[0].strip() if co_h_range else ""
            co_h_high = co_h_range[1].strip("%") if len(co_h_range) > 1 else ""

            oil_range = properties_dict.get("Oil", "").split("-")
            oil_low = oil_range[0].strip() if oil_range else ""
            # Extract only the number from oil_high, removing units like "mL/100g"
            if len(oil_range) > 1:
                oil_high_raw = oil_range[1].strip()
                # Extract just the number part from strings like "3 mL/100g"
                import re
                oil_number_match = re.match(r'^(\d+\.?\d*)', oil_high_raw)
                oil_high = oil_number_match.group(1) if oil_number_match else ""
            else:
                oil_high = ""

            if name and hop_aromas_notes:
                # Extract sensory analysis and product variant data from the individual hop page
                sensory_data, product_variants = extract_hop_page_data(href)
                # Use the function to process the name and country
                name, country = process_name_and_country(name)
                # Create HopEntry directly
                hop_entry = HopEntry(
                    name=name,
                    country=country,
                    source="Yakima Chief Hops",
                    href=href,
                    alpha_from=alpha_low,
                    alpha_to=alpha_high,
                    beta_from=beta_low,
                    beta_to=beta_high,
                    oil_from=oil_low,
                    oil_to=oil_high,
                    co_h_from=co_h_low,
                    co_h_to=co_h_high,
                    notes=hop_aromas_notes,
                    product_variants=product_variants,
                )

                # Set standardized aromas from sensory analysis data
                hop_entry.set_standardized_aromas("yakima", sensory_data)
                return hop_entry
        except Exception as e:
            print(f"Error processing hop {i}: {e}")
            return None

    hop_entries = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(process_hop, i, hop)
            for i, hop in enumerate(hop_data, 1)
        ]
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                hop_entries.append(result)

    # Save using the model's save function
    output_file = "data/yakimachiefhops.json"
    if save:
        save_hop_entries(hop_entries, output_file)

    return hop_entries


def main():
    scrape()


if __name__ == "__main__":
    main()
