// Data loader utility to fetch and process hop data from multiple sources

export const loadHopData = async () => {
  try {
    // Use the correct path for both development and production
    // In development, React serves files from the public folder at the root
    // In production (GitHub Pages), it will be at the correct path
    const basePath = "/HopDatabase"
    const response = await fetch(`${basePath}/data/hops.json`);
    
    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
      console.error(`Attempted to fetch from: ${basePath}/data/hops.json`);
      throw new Error(`Failed to fetch hop data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No hop data found in the file');
    }

    console.log(`Loaded ${data.length} hops from data source`);
    return data;
  } catch (error) {
    console.error('Error loading hop data:', error);
    console.error('Current environment:', process.env.NODE_ENV);
    throw error;
  }
};

export const processHopData = (rawData) => {
  return rawData.map(hop => {
    // Helper function to parse numeric values and remove units
    const parseNumericValue = (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove common units and extract number
        const cleaned = value.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Normalize the data structure
    const processedHop = {
      name: hop.name,
      country: hop.country || 'Unknown',
      source: hop.source,
      href: hop.href,
      
      // Normalize alpha/beta acid ranges with proper parsing
      alpha_from: parseNumericValue(hop.alpha_from || hop['alpha-from'] || 0),
      alpha_to: parseNumericValue(hop.alpha_to || hop['alpha-to'] || hop.alpha_from || hop['alpha-from'] || 0),
      beta_from: parseNumericValue(hop.beta_from || hop['beta-from'] || 0),
      beta_to: parseNumericValue(hop.beta_to || hop['beta-to'] || hop.beta_from || hop['beta-from'] || 0),
      
      // Normalize oil content
      oil_from: parseNumericValue(hop.oil_from || hop['total-oil-from'] || 0),
      oil_to: parseNumericValue(hop.oil_to || hop['total-oil-to'] || hop.oil_from || hop['total-oil-from'] || 0),
      
      // Cohumulone (may not be available for all sources)
      co_h_from: parseNumericValue(hop.co_h_from || hop['co_h_from'] || ''),
      co_h_to: parseNumericValue(hop.co_h_to || hop['co_h_to'] || ''),
      
      // Flavor notes
      notes: hop.notes || [],
      
      // Normalize aroma data
      aromas: normalizeAromaData(hop.aromas || {}),
      
      // Additional properties if available
      additional_properties: hop.additional_properties || {}
    };

    return processedHop;
  }).filter(hop => hop.name && hop.name.trim() !== ''); // Filter out any hops without names
};

const normalizeAromaData = (aromaData) => {
  // Standard aroma categories we want to support
  const standardCategories = {
    'Citrus': ['Citrus', 'citrusy', 'citrus'],
    'Resin/Pine': ['Resin/Pine', 'resinous', 'piney', 'pine', 'resin'],
    'Spice': ['Spice', 'spicy', 'spices'],
    'Herbal': ['Herbal', 'herbal'],
    'Grassy': ['Grassy', 'grassy', 'green'],
    'Floral': ['Floral', 'floral'],
    'Berry': ['Berry', 'berry', 'berries'],
    'Stone Fruit': ['Stone Fruit', 'stone fruit'],
    'Tropical Fruit': ['Tropical Fruit', 'tropical fruit', 'tropical', 'tropical fruits'],
  };

  const normalizedAromas = {};

  // Initialize all categories with 0
  Object.keys(standardCategories).forEach(category => {
    normalizedAromas[category] = 0;
  });

  // Map the existing aroma data to standard categories
  Object.entries(aromaData).forEach(([key, value]) => {
    const normalizedValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    const keyLower = key.trim().toLowerCase();
    for (const [standardCategory, aliases] of Object.entries(standardCategories)) {
      if (aliases.some(alias => keyLower === alias.trim().toLowerCase())) {
        normalizedAromas[standardCategory] = Math.max(normalizedAromas[standardCategory], normalizedValue);
        break;
      }
    }
  });

  return normalizedAromas;
};
