from bs4 import BeautifulSoup
import requests as req
import json
import os


def scrape():
    if not os.path.exists("YakimaChiefHops/yvh_html.html"):
        r = req.get(
            "https://www.yakimachief.com/commercial/hop-varieties.html?product_list_limit=all"
        )
        html = r.text
        # Perform the request and export the file
        with open("YakimaChiefHops/yvh_html.html", "w") as file:
            file.write(html)
    else:
        with open("YakimaChiefHops/yvh_html.html", "r") as file:
            html = file.read()

    soup = BeautifulSoup(html, "html.parser")

    hop_data = soup.find_all("li", {"class": "item product product-item"})
    data_collection = []
    for hop in hop_data:
        href = hop.find("a", {"class": "hop"})["href"]
        # Extract brewing values
        product_properties = hop.find("table", {"class": "product-properties"})

        # Aromas
        product_details = hop.find("div", {"class": "product-item-details-wrapper"})
        hop_aromas_notes = product_details.find("p", {"class": "product-sight"})
        if hop_aromas_notes is not None:
            hop_aromas_notes = hop_aromas_notes.contents[0].strip().split(",")

        # Name
        name = product_details.find("a").contents[0].strip()

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
            data_dict = {
                "name": name,
                "country": "",
                "href": href,
                "alpha-from": alpha_low,
                "alpha_to": alpha_high,
                "beta_from": beta_low,
                "beta_to": beta_high,
                "co_h_from": co_h_low,
                "co_h_to": co_h_high,
                "oil_from": oil_low,
                "oil_to": oil_high,
                "notes": hop_aromas_notes,
                "aromas": "",
                "source": "Yakima Chief Hops"
            }
            data_collection.append(data_dict)
            print(data_dict)

        # Export data collection to JSON file
        with open("data/yakimachiefhops.json", "w") as file:
            json.dump(data_collection, file, indent=4)


def main():
    scrape()


if __name__ == "__main__":
    main()
