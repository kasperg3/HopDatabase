from bs4 import BeautifulSoup
import requests as req
import math
import time
import sys

sys.path.append("..")
from hop_model import HopEntry, save_hop_entries


def extract_sensory_analysis(hop_url):
    """
    Extract sensory analysis data from individual hop page.
    Returns a dictionary with aroma categories and their intensity values (0-5).
    """
    try:
        response = req.get(hop_url)
        soup = BeautifulSoup(response.text, "html.parser")

        # Find the sensory analysis SVG
        sensory_div = soup.find("div", {"class": "sensory-analysis"})
        if not sensory_div:
            return {}

        svg = sensory_div.find("svg")
        if not svg:
            return {}

        # Extract aroma categories from text labels
        aroma_labels = []
        for text_elem in svg.find_all("text", {"class": "chart-label"}):
            tspan_elements = text_elem.find_all("tspan")
            if tspan_elements:
                # Combine multi-line labels
                label_text = " ".join(
                    [tspan.get_text().strip() for tspan in tspan_elements]
                )
            else:
                label_text = text_elem.get_text().strip()
            aroma_labels.append(label_text)

        # Extract polygon points that represent the intensity values
        polygon = svg.find("polygon", {"class": "polygon-chart"})
        if not polygon:
            return {}

        points_str = polygon.get("points", "")
        if not points_str:
            return {}

        # Parse polygon points
        points = []
        for point in points_str.split():
            if "," in point:
                x, y = point.split(",")
                points.append((float(x), float(y)))

        # Convert polygon coordinates to intensity values (0-5 scale)
        sensory_data = convert_polygon_to_intensities(points, aroma_labels)

        return sensory_data

    except Exception as e:
        print(f"Error extracting sensory analysis from {hop_url}: {e}")
        return {}


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


def scrape():
    r = req.get(
        "https://www.yakimachief.com/commercial/hop-varieties.html?product_list_limit=all"
    )
    html = r.text
    # Perform the request and export the file
    with open("YakimaChiefHops/yvh_html.html", "w") as file:
        file.write(html)

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
            oil_high = oil_range[1].strip("%") if len(oil_range) > 1 else ""

            if name and hop_aromas_notes:
                # Extract sensory analysis data
                sensory_data = extract_sensory_analysis(href)

                # Create HopEntry directly
                hop_entry = HopEntry(
                    name=name,
                    country="",
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
    save_hop_entries(hop_entries, output_file)

    return hop_entries


def main():
    scrape()


if __name__ == "__main__":
    main()
