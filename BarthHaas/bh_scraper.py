import json
import os
import requests as req
from bs4 import BeautifulSoup


def scrape():
    url = "https://www.barthhaas.com/hops-and-products/hop-varieties-overview"
    if not os.path.exists("BarthHaas/bh.html"):
        r = req.get(url)
        html = r.text
        # Perform the request and export the file
        with open("BarthHaas/bh.html", "w") as file:
            file.write(html)
    else:
        with open("BarthHaas/bh.html", "r") as file:
            html = file.read()

    soup = BeautifulSoup(html, "html.parser")
    hop_info = soup.find_all("div", class_="col-12 col-lg-4 section-card-item")
    hop_list = []
    # aromas
    for hop in hop_info:
        # hop_cards = hop.find_all('div', class_='section-card card-content-height')
        # hop_aromas = hop.find('ul', class_='section-card-text__tastes')
        hop_flavour_notes = [aroma.text.strip() for aroma in hop.find_all("li")]
        # hop Data
        href = hop.find('a', {'class': 'section-card-link'})
        href = href['href'] if href is not None else ""
        
        hop_data = {
            "alpha-from": hop.attrs["data-alpha-from"],
            "alpha-to": hop.attrs["data-alpha-to"],
            "beta-from": hop.attrs["data-beta-from"],
            "beta-to": hop.attrs["data-beta-to"],
            "total-oil-from": hop.attrs["data-oil-from"],
            "total-oil-to": hop.attrs["data-oil-to"],
            "country": hop.attrs["data-country"],
            "name": hop.attrs["data-name"],
            "aromas": {key.strip("raw"): value for key, value in json.loads(hop.attrs["data-filter-values"]).items()},
            "notes": hop_flavour_notes,
            "href": "https://www.barthhaas.com/" + href,
            "source": "BarthHaas"
        }
        hop_list.append(hop_data)
    
        
    # Export data collection to JSON file
    with open("data/baathhaas.json", "w") as file:
        json.dump(hop_list, file, indent=4)


def main():
    # Call the scrape function
    scrape()


if __name__ == "__main__":
    main()
