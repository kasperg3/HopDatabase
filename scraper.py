from YakimaChiefHops import ych_scraper
from BarthHaas import bh_scraper
from hopsteiner import hs_scraper
import json

ych = ych_scraper.scrape()
bh = bh_scraper.scrape()
hs = hs_scraper.scrape()

combined_json = ych + bh + hs

len(combined_json)

# Dump combined_json to a JSON file
with open('data/combined.json', 'w') as file:
    json.dump(combined_json, file, indent=4)
    
print(f"Data dumped to data/combined.json, with {len(combined_json)} entries")