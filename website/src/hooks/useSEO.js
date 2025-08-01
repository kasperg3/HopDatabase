import { useEffect } from 'react';

export const useSEO = (selectedHops, hopData) => {
  useEffect(() => {
    updatePageTitle(selectedHops);
    updateMetaDescription(selectedHops);
    updateStructuredData(selectedHops, hopData);
  }, [selectedHops, hopData]);
};

const updatePageTitle = (selectedHops) => {
  if (selectedHops.length === 0) {
    document.title = 'Hop Database - Ultimate Hop Comparison Tool';
  } else if (selectedHops.length === 1) {
    const hopName = selectedHops[0].split(' - ')[0];
    document.title = `${hopName} Hop Profile - Hop Database`;
  } else {
    const hopNames = selectedHops.map(hop => hop.split(' - ')[0]).join(', ');
    document.title = `Compare ${hopNames} - Hop Database`;
  }
};

const updateMetaDescription = (selectedHops) => {
  const metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) return;

  let description;
  if (selectedHops.length === 0) {
    description = 'The ultimate hop database and comparison tool for brewers. Search 200+ hop varieties, compare brewing parameters and aroma profiles.';
  } else if (selectedHops.length === 1) {
    const hopName = selectedHops[0].split(' - ')[0];
    description = `Detailed ${hopName} hop profile including alpha acid content, aroma characteristics, and brewing recommendations.`;
  } else {
    const hopNames = selectedHops.map(hop => hop.split(' - ')[0]).join(', ');
    description = `Compare ${hopNames} hop varieties side by side. Analyze brewing parameters and aroma profiles.`;
  }
  
  metaDescription.setAttribute('content', description);
};

const updateStructuredData = (selectedHops, hopData) => {
  // Remove existing structured data
  const existing = document.querySelector('#hop-structured-data');
  if (existing) existing.remove();

  if (selectedHops.length === 0) return;

  try {
    const selectedHopData = selectedHops
      .map(hopUniqueId => hopData.find(hop => `${hop.name} (${hop.source})` === hopUniqueId))
      .filter(hop => hop && hop.name);

    if (selectedHopData.length === 0) return;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Hop Comparison: ${selectedHops.map(hop => hop.split(' - ')[0]).join(', ')}`,
      "description": "Detailed comparison of hop varieties including brewing parameters and aroma profiles",
      "numberOfItems": selectedHopData.length,
      "itemListElement": selectedHopData.map((hop, index) => {
        let aromasText = 'various aromas';
        if (hop.aromas && Array.isArray(hop.aromas) && hop.aromas.length > 0) {
          aromasText = hop.aromas.slice(0, 3).join(', ');
        } else if (hop.aromas && typeof hop.aromas === 'string') {
          aromasText = hop.aromas;
        }

        return {
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": hop.name,
            "description": `${hop.name} hop variety with alpha acids and aroma profile including ${aromasText}`,
            "category": "Beer Brewing Ingredient",
            "brand": hop.source || "Unknown",
            "additionalProperty": [
              {
                "@type": "PropertyValue",
                "name": "Alpha Acids",
                "value": hop.alpha_from && hop.alpha_to ? `${hop.alpha_from}-${hop.alpha_to}%` : "Unknown"
              },
              {
                "@type": "PropertyValue",
                "name": "Beta Acids", 
                "value": hop.beta_from && hop.beta_to ? `${hop.beta_from}-${hop.beta_to}%` : "Unknown"
              }
            ]
          }
        };
      })
    };

    const script = document.createElement('script');
    script.id = 'hop-structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  } catch (error) {
    console.warn('Error generating structured data:', error);
  }
};
