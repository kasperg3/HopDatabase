import json
import os
import requests as req
from bs4 import BeautifulSoup
import sys
sys.path.append('..')
from hop_model import HopEntry, save_hop_entries


def scrape():
    url = "https://www.barthhaas.com/hops-and-products/hop-varieties-overview"
    r = req.get(url)
    html = r.text
    # Perform the request and export the file
    with open("BarthHaas/bh.html", "w") as file:
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
        
        # Extract aroma data
        aroma_data = {key.strip("raw"): value for key, value in json.loads(hop.attrs["data-filter-values"]).items()}
        
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
    save_hop_entries(hop_entries, "data/baathhaas.json")
    print(f"Data dumped to data/baathhaas.json, with {len(hop_entries)} entries")

    return hop_entries

def main():
    # Call the scrape function
    scrape()


if __name__ == "__main__":
    main()
