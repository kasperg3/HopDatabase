from bs4 import BeautifulSoup
import requests as req
import regex as re
import json
r = req.get("https://beermaverick.com/hops/")

soup = BeautifulSoup(r.text, "html.parser")

# Find all grid links
hop_links = soup.find_all("a")
# Resulting line
# 038: <a href="/hop/astra/">Astra</a>
hop_hrefs = ["https://beermaverick.com/" + link["href"] for link in hop_links if link["href"].startswith("/hop/")]

for hop_href in hop_hrefs:
    # Extract brewing values
    hop_page = req.get(hop_href)
    hop_soup = BeautifulSoup(hop_page.text, "html.parser")
    hop_brewing_values = hop_soup.find("table", {"class":"brewvalues"})
    for row in hop_brewing_values("tr"):
        description = row("small")
        label =row.find("th").contents[0]        
        print(f"{label}: {row("td")}")

    # Extract hop aroma
    hop_aroma = hop_soup.find_all("script", {"type":"pmdelayedscript"})[17]
    hop_aroma_script = hop_aroma.string
    data_match = re.search(r"data:\s*(\[.*?\])", hop_page.text)
    labels_match = re.search(r"labels:\s*(\[.*?\])", hop_page.text)

    if data_match and labels_match:
        data = eval(data_match.group(1))
        labels = eval(labels_match.group(1))
        # Use the data and labels variables here
        # ...
    else:
        print("Data or labels not found in hop_aroma")
    

    