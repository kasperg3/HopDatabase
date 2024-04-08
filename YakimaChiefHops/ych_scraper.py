

from bs4 import BeautifulSoup
import requests as req
import json
import os


def scrape():
    if not os.path.exists('YakimaChiefHops/yvh_html.html'):
        r = req.get("https://www.yakimachief.com/commercial/hop-varieties.html?product_list_limit=all")
        html = r.text
        # Perform the request and export the file
        with open('YakimaChiefHops/yvh_html.html', 'w') as file:
            file.write(html)
    else: 
        with open('YakimaChiefHops/yvh_html.html', 'r') as file:
            html = file.read()
            

    soup = BeautifulSoup(html, "html.parser")

    hop_data = soup.find_all("li", {"class":"item product product-item"})
    data_collection =  []
    for hop in hop_data:
        href = hop.find("a", {"class":"hop"})["href"]
        # Extract brewing values
        product_properties = hop.find("table", {"class":"product-properties"})
        
        # Aromas
        product_details = hop.find("div", {"class":"product-item-details-wrapper"})
        hop_aromas = product_details.find("p", {"class":"product-sight"})
        if hop_aromas is not None:
            hop_aromas = hop_aromas.contents[0].strip().split(",")
        
        # Name
        name = product_details.find("a").contents[0].strip()
        
        properties_dict = {}
        for row in product_properties("tr"):
            contents = row.find_all("td")
            key = contents[0].contents[0].strip(":")
            value = contents[1].contents[0]
            properties_dict[key] = value
        
        if name and hop_aromas:
            data_dict = {"name":name, "href":href,"properties":properties_dict, "aromas":hop_aromas}
            data_collection.append(data_dict)
            print(data_dict)
        
        # Export data collection to JSON file
        with open('YakimaChiefHops/ych_hop_data.json', 'w') as file:
            json.dump(data_collection, file)
        