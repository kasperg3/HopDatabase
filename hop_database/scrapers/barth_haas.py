import json
import os
import requests as req
from bs4 import BeautifulSoup

from ..models.hop_model import HopEntry, save_hop_entries


def scrape(save=True):
    url = "https://www.barthhaas.com/hops-and-products/hop-varieties-overview"
    r = req.get(url)
    html = r.text
    # Perform the request and export the file
    html_path = os.path.join(os.path.dirname(__file__), "..", "data", "bh.html")
    with open(html_path, "w") as file:
        file.write(html)

    soup = BeautifulSoup(html, "html.parser")
    hop_info = soup.find_all("div", class_="col-12 col-lg-4 section-card-item")
    hop_entries = []
    # aromas
    for hop in hop_info:
        # hop_cards = hop.find_all('div', class_='section-card card-content-height')
        # hop_aromas = hop.find('ul', class_='section-card-text__tastes')
        hop_flavour_notes = [aroma.text.strip() for aroma in hop.find_all("li")]
        # hop Data
        href = hop.find('a', {'class': 'section-card-link'})
        href = href['href'] if href is not None else ""
        
        # Extract aroma data with error handling
        try:
            filter_values = hop.attrs.get("data-filter-values", "{}")
            if isinstance(filter_values, str):
                # Handle empty string case
                if filter_values.strip() == "" or filter_values.strip() == '""':
                    aroma_data_raw = {}
                else:
                    aroma_data_raw = json.loads(filter_values)
            else:
                aroma_data_raw = filter_values
            
            # Ensure aroma_data_raw is a dictionary
            if isinstance(aroma_data_raw, dict):
                aroma_data = {key.strip("raw"): value for key, value in aroma_data_raw.items()}
            else:
                print(f"Warning: data-filter-values is not a dict for hop {hop.attrs.get('data-name', 'unknown')}: {type(aroma_data_raw)}")
                aroma_data = {}
        except (json.JSONDecodeError, AttributeError, KeyError) as e:
            print(f"Error parsing aroma data for hop {hop.attrs.get('data-name', 'unknown')}: {e}")
            aroma_data = {}
        
        # Create HopEntry directly
        hop_entry = HopEntry(
            name=hop.attrs["data-name"],
            country=hop.attrs["data-country"],
            source="Barth Haas",
            href="https://www.barthhaas.com/" + href,
            alpha_from=hop.attrs["data-alpha-from"],
            alpha_to=hop.attrs["data-alpha-to"],
            beta_from=hop.attrs["data-beta-from"],
            beta_to=hop.attrs["data-beta-to"],
            oil_from=hop.attrs["data-oil-from"],
            oil_to=hop.attrs["data-oil-to"],
            co_h_from="",  # Not available in Barth Haas data
            co_h_to="",
            notes=hop_flavour_notes
        )
        
        # Set standardized aromas from structured aroma data
        hop_entry.set_standardized_aromas("barth", aroma_data)
        hop_entries.append(hop_entry)
    

    # Save using the new model's save function
    if save:
        save_hop_entries(hop_entries, "data/barthhaas.json")
        print(f"Data dumped to data/barthhaas.json, with {len(hop_entries)} entries")

    return hop_entries

def main():
    # Call the scrape function
    scrape()


if __name__ == "__main__":
    main()
