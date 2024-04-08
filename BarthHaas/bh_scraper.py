import json


def scrape():
    # Export data collection to JSON file
    with open('BarthHaas/bh_hop_data.json', 'w') as file:
        json.dump({"test": "test"}, file)
