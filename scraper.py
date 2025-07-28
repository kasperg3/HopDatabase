from YakimaChiefHops import ych_scraper
from BarthHaas import bh_scraper
from hopsteiner import hs_scraper
from hop_model import save_hop_entries

ych = ych_scraper.scrape()
bh = bh_scraper.scrape()
hs = hs_scraper.scrape()

combined_hop_entries = ych + bh + hs

len(combined_hop_entries)

# Save using the new model's save function
save_hop_entries(combined_hop_entries, 'data/hops.json')
    
print(f"Data dumped to data/hops.json, with {len(combined_hop_entries)} entries")