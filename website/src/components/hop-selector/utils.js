// Import shared functions and constants
export { 
  parseValue,
  parseOilValue,
  getAverageValue,
  formatRange,
  getAlphaClassification,
  getOilClassification,
  getCohumuloneClassification,
  getBetaAlphaClassification,
  getHopPurpose
} from '../../utils/hopUtils';

// HopSelector-specific utility functions that aren't shared

// Helper function to check if a hop has all zero aromas
export const hasAllZeroAromas = (hop) => {
  if (!hop.aromas || typeof hop.aromas !== 'object') return true;
  return Object.values(hop.aromas).every(intensity => intensity === 0);
};

// Helper function to get bottom 3 aromas for a hop (including all ties with 3rd place)
export const getBottomAromas = (hop, count = 3) => {
  if (!hop.aromas || typeof hop.aromas !== 'object') return [];
  
  const sortedAromas = Object.entries(hop.aromas)
    .sort(([_, a], [__, b]) => a - b) // Sort ascending (lowest first)
    .map(([category, intensity]) => ({ category, intensity }));
  
  if (sortedAromas.length <= count) {
    return sortedAromas;
  }
  
  // Get the intensity of the 3rd place aroma (3rd lowest)
  const thirdPlaceIntensity = sortedAromas[count - 1].intensity;
  
  // Include all aromas that have intensity <= 3rd place intensity
  return sortedAromas.filter(aroma => 
    aroma.intensity <= thirdPlaceIntensity
  );
};

export const getTopAromas = (hop, count = 3) => {
  if (!hop.aromas || typeof hop.aromas !== 'object') return [];
  
  const sortedAromas = Object.entries(hop.aromas)
    .filter(([_, intensity]) => intensity > 0)
    .sort(([_, a], [__, b]) => b - a)
    .map(([category, intensity]) => ({ category, intensity }));
  
  if (sortedAromas.length <= count) {
    return sortedAromas;
  }
  
  // Get the intensity of the 3rd place aroma
  const thirdPlaceIntensity = sortedAromas[count - 1].intensity;
  
  // Include all aromas that have intensity > 3rd place intensity OR equal to 3rd place intensity
  return sortedAromas.filter(aroma => 
    aroma.intensity >= thirdPlaceIntensity
  );
};
