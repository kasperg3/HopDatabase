import json
import os

from ..models.hop_model import HopEntry, save_hop_entries

def scrape():
    # Specify the path to the JSON file
    file_path = os.path.join(os.path.dirname(__file__), "..", "data", "hopsteiner_raw_data.json")

    # Load the JSON data from the file
    with open(file_path, "r") as file:
        data = json.load(file)

    # "main_country": "Germany",
    # 'name'
    # "acid_alpha": "13.0 - 17.0",
    # "acid_beta": "4.0 - 5.5",
    # "cohumulone": "31 - 38",
    # "acid_hardresins": "0.14 - 0.24",
    # "polyphenoles": "3.5",
    # "xantholhumol": "0.6 - 0.8",
    # "oils": "1.4 - 2.4",
    # "humulen": "0.28 - 0.30",
    # "farnesen": "0.00 - 1.00",
    # "linalool_oil": "0.3 - 0.8",
    # "linalool_acid": "0.02 - 0.05",
    # "aroma_spec": "pepper, spicy, resinous, orange",
    # "aromas": {
    #     "1": 3,
    #     "2": 2,
    #     "3": 3,
    #     "4": 3,
    #     "5": 2,
    #     "6": 1,
    #     "7": 1
    # },
    # "genetic_origin": "Herkules is a daughter of the variety Hallertau Taurus and was bred at the Hop Research Center in Huell.",
    # "cone_url": "https:\/\/www.hopsteiner.com\/wp-content\/uploads\/2016\/04\/Herkules.png",
    # "permalink": "herkules",

    hop_data = []
    # Iterate over each entry in the JSON data
    for entry in data["hops"]:
        # Extract the required fields from the entry
        name = entry["name"]
        href = entry["permalink"]
        alpha_low, alpha_high = (
            map(float, entry["acid_alpha"].split(" - "))
            if " - " in entry["acid_alpha"]
            else (float(entry["acid_alpha"]), float(entry["acid_alpha"]))
        )
        if entry["acid_beta"] != "0.0":
            beta_low, beta_high = (
                map(float, entry["acid_beta"].split(" - "))
                if " - " in entry["acid_beta"]
                else (float(entry["acid_beta"]), float(entry["acid_beta"]))
            )
        else:
            beta_low = 0.0
            beta_high = 0.0
        co_h_low, co_h_high = (
            map(int, entry["cohumulone"].split(" - "))
            if " - " in entry["cohumulone"]
            else (int(entry["cohumulone"]), int(entry["cohumulone"]))
        )
        oil_low, oil_high = (
            map(float, entry["oils"].split(" - "))
            if " - " in entry["oils"]
            else (float(entry["oils"]), float(entry["oils"]))
        )

        # Extra oil properties
        acid_hardresins_low, acid_hardresins_high = (
            map(float, entry["acid_hardresins"].split(" - "))
            if " - " in entry["acid_hardresins"]
            else (float(entry["acid_hardresins"]), float(entry["acid_hardresins"]))
        )
        polyphenoles_low, polyphenoles_high = (
            map(float, entry["polyphenoles"].split(" - "))
            if " - " in entry["polyphenoles"]
            else (float(entry["polyphenoles"]), float(entry["polyphenoles"]))
        )
        xantholhumol_low, xantholhumol_high = (
            map(float, entry["xantholhumol"].split(" - "))
            if " - " in entry["xantholhumol"]
            else (float(entry["xantholhumol"]), float(entry["xantholhumol"]))
        )
        oils_low, oils_high = (
            map(float, entry["oils"].split(" - "))
            if " - " in entry["oils"]
            else (float(entry["oils"]), float(entry["oils"]))
        )
        humulen_low, humulen_high = (
            map(float, entry["humulen"].split(" - "))
            if " - " in entry["humulen"]
            else (float(entry["humulen"]), float(entry["humulen"]))
        )
        farnesen_low, farnesen_high = (
            map(float, entry["farnesen"].split(" - "))
            if " - " in entry["farnesen"]
            else (float(entry["farnesen"]), float(entry["farnesen"]))
        )
        linalool_oil_low, linalool_oil_high = (
            map(float, entry["linalool_oil"].split(" - "))
            if " - " in entry["linalool_oil"]
            else (float(entry["linalool_oil"]), float(entry["linalool_oil"]))
        )
        linalool_acid_low, linalool_acid_high = (
            map(float, entry["linalool_acid"].split(" - "))
            if " - " in entry["linalool_acid"]
            else (float(entry["linalool_acid"]), float(entry["linalool_acid"]))
        )
        # "linalool_acid": "0.25 - 0.33",

        hop_aromas_notes = entry["aroma_spec"].split(", ")
        # Map numeric IDs directly to standard aroma categories
        aroma_mapping = {
            "1": "Stone Fruit",  # Fruity → Stone Fruit
            "2": "Floral",       # Floral → Floral
            "3": "Citrus",       # citrusy → Citrus
            "4": "Spice",        # Spicy → Spice
            "5": "Resin/Pine",   # Resinous → Resin/Pine
            "6": "Herbal",       # Herbal → Herbal
            "7": "Floral",       # sugar like → closest match is Floral (sweet aromatics)
            "8": "Herbal",       # Other → default to Herbal
        }

        if "aromas" in entry:
            hop_aromas = {
                aroma_mapping[str(key)]: value for key, value in entry["aromas"].items()
            }
        else:
            hop_aromas = []
            
        # Create additional properties dictionary for extended data
        additional_properties = {
            "acid_hardresins_from": acid_hardresins_low,
            "acid_hardresins_to": acid_hardresins_high,
            "polyphenoles_from": polyphenoles_low,
            "polyphenoles_to": polyphenoles_high,
            "xantholhumol_from": xantholhumol_low,
            "xantholhumol_to": xantholhumol_high,
            "oils_from": oils_low,
            "oils_to": oils_high,
            "humulen_from": humulen_low,
            "humulen_to": humulen_high,
            "farnesen_from": farnesen_low,
            "farnesen_to": farnesen_high,
            "linalool_oil_from": linalool_oil_low,
            "linalool_oil_to": linalool_oil_high,
            "linalool_acid_from": linalool_acid_low,
            "linalool_acid_to": linalool_acid_high
        }
        
        # Create HopEntry directly
        hop_entry = HopEntry(
            name=name,
            country=entry["main_country"],
            source="Hopsteiner",
            href="https://www.hopsteiner.com/variety-data-sheets/" + href,
            alpha_from=alpha_low,
            alpha_to=alpha_high,
            beta_from=beta_low,
            beta_to=beta_high,
            oil_from=oil_low,
            oil_to=oil_high,
            co_h_from=co_h_low,
            co_h_to=co_h_high,
            notes=hop_aromas_notes,
            additional_properties=additional_properties,
            standardized_aromas=hop_aromas
        )        
        hop_data.append(hop_entry)
    
    # Save using the new model's save function
    save_hop_entries(hop_data, "data/hopsteiner.json")
    print(f"Data dumped to data/hopsteiner.json, with {len(hop_data)} entries")

    return hop_data


def main():
    scrape()


if __name__ == "__main__":
    main()
