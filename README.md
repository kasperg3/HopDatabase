[![Python Scripts CI](https://github.com/kasperg3/HopDatabase/actions/workflows/ci.yaml/badge.svg)](https://github.com/kasperg3/HopDatabase/actions/workflows/ci.yaml)

# Hop Database

Welcome to the Hop Database project! This database is created by using web scraping techniques and contains information from various hops producers' websites.

## 🌐 Live Website

**[Try the Hop Comparison Tool](https://kasperg3.github.io/HopDatabase)** - Interactive web application for comparing hop aroma profiles

## 📊 Data Sources

* Hopsteiner
* Yakima Chief Hops
* BarthHaas

## Description

The Hop Database is a comprehensive collection of data related to different hop varieties used in the brewing industry. It provides detailed information about each hop, including its origin, flavor profile, alpha acid and more. Whether you're a homebrewer, a professional brewer, or simply a hop enthusiast, this database can be a valuable resource for exploring and learning about different hops.

## Features

* **Web Scraping**: The database is created by scraping data from reputable hops producers' websites, ensuring accurate and up-to-date information.

## Data Format

The Hop Database stores hop information in JSON format. Each hop entry follows the structure of [data/hopsteiner.json](data/hopsteiner.json).
The keys of all the entries are the same across the different hop providers, but values such as "aroma" will have different values across the different providers.

Other values such as farnesen, will not be present in the yvh and bh data, as this is not directly available (Though this can be scraped, and is a WIP).

## Getting Started

To get started with the Hop Database, follow these steps:

1. Clone the repository: `git clone https://github.com/your-username/hop-database.git`
2. Install the necessary dependencies: `pip install requirements.txt`
3. (optional) hopsteiner data will have to be updated manually, see: [Link](hopsteiner/README.md)
4. Run the scraper to extract the data: `python scraper.py`

## Contributing

Contributions to the Hop Database project are welcome! If you have suggestions for new features, improvements, or bug fixes, please open an issue or submit a pull request. For more information, please refer to the [Contribution Guidelines](CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

If you have any questions or feedback, feel free to reach out to us at <kaspergrontved@gmail.com>.

Happy hopping!
