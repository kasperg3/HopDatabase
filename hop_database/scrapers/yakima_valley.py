import requests
import re
import json
from typing import List, Optional, Tuple
from bs4 import BeautifulSoup


# Assuming hop_model is in a parent directory or the path is configured.
# If running this script directly, you might need to adjust the import path.
from ..models.hop_model import HopEntry, save_hop_entries

def parse_range(value_str: Optional[str]) -> Tuple[str, str]:
    """
    Parses a string that might contain a range (e.g., "12.5 - 14.5%").

    Args:
        value_str: The string to parse.

    Returns:
        A tuple containing the from and to values.
    """
    if not value_str:
        return "", ""
    
    # Remove percentages, HTML entities, and other common text, then strip whitespace
    value_str = str(value_str).replace("%", "").replace("&lt;", "").replace("mL/100g", "").strip()
    
    # Split by hyphen
    parts = [p.strip() for p in value_str.split("-")]
    
    if len(parts) == 2:
        return parts[0], parts[1]
    elif len(parts) == 1:
        # Use regex to find the first number in the string
        num_match = re.search(r'[\d\.]+', parts[0])
        if num_match:
            return num_match.group(0), ""
    return "", ""


def get_hop_data_from_api(vendor_filter: Optional[str] = None) -> List[HopEntry]:
    """
    Gets all individual hop data by directly querying the Searchspring API and
    parsing the description HTML and collection handles included in the API response. 
    It iterates through all pages and can filter by vendor.

    Args:
        vendor_filter: An optional string to filter results by vendor.

    Returns:
        A list of HopEntry objects.
    """
    hop_entries = []
    page = 1
    
    try:
        # This is the site ID for Yakima Valley Hops on Searchspring.
        site_id = "lb19fj"
        
        while True:
            # Base API URL
            base_api_url = f"https://{site_id}.a.searchspring.io/api/search/search.json"
            
            # Parameters for the request
            params = {
                'resultsFormat': 'json',
                'siteId': site_id,
                'q': '',
                'page': page,
                'resultsPerPage': 200,
                'collection': 'all-hops'
            }

            # Add the vendor filter if it's provided
            if vendor_filter:
                params['filter.vendor'] = vendor_filter

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }

            print(f"Fetching page {page} from API...")
            response = requests.get(base_api_url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            results = data.get('results', [])
            
            # If the results list is empty, we've reached the end.
            if not results:
                print("No more results found. Finished fetching.")
                break

            for product in results:
                name = product.get('name', '')
                # Only include products that end with "Hops" (case-insensitive) and are not blends/kits.
                if not name.lower().endswith(" hops") or any(keyword in name.lower() for keyword in ["blend", "kit", "lupomax"]):
                    continue

                # Remove "Hops" from the end of the name.
                cleaned_name = name[:-5].strip()

                # Parse the description HTML from the API response
                description_html = product.get('description', '')
                soup = BeautifulSoup(description_html, 'html.parser')
                
                brewing_values = {}
                # --- Method 1: Parse from a table ---
                table = soup.find('table')
                if table:
                    for row in table.find_all('tr'):
                        cells = row.find_all('td')
                        if len(cells) == 2:
                            key = cells[0].get_text(strip=True)
                            value = cells[1].get_text(strip=True)
                            brewing_values[key] = value
                
                # --- Method 2: Parse from bold tags if no table is found ---
                if not brewing_values:
                    for strong_tag in soup.find_all('strong'):
                        if ':' in strong_tag.text:
                            key = strong_tag.text.replace(':', '').strip()
                            value = strong_tag.next_sibling.strip() if strong_tag.next_sibling else ''
                            brewing_values[key] = value

                # --- Method 3: Regex fallback for plain text ---
                desc_text = soup.get_text()
                if not brewing_values.get("Alpha Acids"):
                    match = re.search(r'Alpha Acids[:\s*]+([\d\.\s-]+%)', desc_text, re.IGNORECASE)
                    if match: brewing_values["Alpha Acids"] = match.group(1)
                if not brewing_values.get("Beta Acids"):
                     match = re.search(r'Beta Acids[:\s*]+([\d\.\s-]+%)', desc_text, re.IGNORECASE)
                     if match: brewing_values["Beta Acids"] = match.group(1)
                if not brewing_values.get("Total Oil"):
                     match = re.search(r'Total Oil[:\s*]+([\d\.\s-]+)', desc_text, re.IGNORECASE)
                     if match: brewing_values["Total Oil (mL/100g)"] = match.group(1)


                # Extract notes from the 'Aroma:' bold tag in the description
                notes = []
                aroma_tag = soup.find('strong', string=re.compile(r'Aroma'))
                if aroma_tag and aroma_tag.next_sibling:
                    notes_text = aroma_tag.next_sibling.strip().lstrip(':').strip()
                    notes = [note.strip() for note in notes_text.split(',')]

                # Extract additional aroma notes from the collection_handle
                collection_handles = product.get('collection_handle', [])
                aroma_notes_from_handles = []
                ignore_keywords = ['hops', 'pellets', 'regions', 'sale', 'domestic', 'international', 'crop-closeout', 'all']

                if isinstance(collection_handles, list):
                    for handle in collection_handles:
                        is_aroma = True
                        for keyword in ignore_keywords:
                            if keyword in handle:
                                is_aroma = False
                                break
                        if is_aroma:
                            aroma_note = handle.replace('-', ' ').strip()
                            if aroma_note:
                                aroma_notes_from_handles.append(aroma_note)

                # Combine notes from both sources, avoiding duplicates
                combined_notes = notes + [note for note in aroma_notes_from_handles if note not in notes]

                alpha_from, alpha_to = parse_range(brewing_values.get("Alpha Acids"))
                beta_from, beta_to = parse_range(brewing_values.get("Beta Acids"))
                co_h_from, co_h_to = parse_range(brewing_values.get("Cohumulone"))
                oil_from, oil_to = parse_range(brewing_values.get("Total Oil (mL/100g)") or brewing_values.get("Total Oil"))

                hop_entry = HopEntry(
                    name=cleaned_name, # Use the cleaned name
                    source="Yakima Valley Hops",
                    href=product.get('url'),
                    alpha_from=alpha_from,
                    alpha_to=alpha_to,
                    beta_from=beta_from,
                    beta_to=beta_to,
                    oil_from=oil_from,
                    oil_to=oil_to,
                    co_h_from=co_h_from,
                    co_h_to=co_h_to,
                    notes=combined_notes, # Use the combined notes
                )
                hop_entry.set_standardized_aromas("yakima_valley")
                hop_entries.append(hop_entry)
                print(f"Successfully parsed: {cleaned_name}")
            
            # Move to the next page for the next iteration.
            page += 1

        print(f"Found {len(hop_entries)} unique hops from the API across all pages.")
        return hop_entries
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from Searchspring API: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from API response: {e}")
        return []


def main():
    """
    Main function to run the scraper.
    """
    # To filter by vendor, pass the vendor name as an argument.
    # For example: get_hop_data_from_api(vendor_filter="Yakima Valley Hops")
    hop_entries = get_hop_data_from_api(vendor_filter="Yakima Valley Hops")

    if not hop_entries:
        print("No hop data found. Exiting.")
        return

    if hop_entries:
        # Save the data to a JSON file
        output_file = "data/yakimavalleyhops.json"
        save_hop_entries(hop_entries, output_file)
    else:
        print("No hop entries were successfully scraped.")


if __name__ == "__main__":
    main()
