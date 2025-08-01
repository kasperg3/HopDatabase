// Centralized utility exports for cleaner imports throughout the app
export * from './hopUtils';
export * from './hopConstants';

// Import dataLoader functions with specific names to avoid conflicts
export { 
  loadHopData,
  processHopData as processRawHopData 
} from './dataLoader';

// Re-export common utilities with cleaner names
export { 
  getAverageValue as avg,
  formatRange as range,
  parseValue as parse,
  processHopData as processHopDataForAnalysis
} from './hopUtils';

// Validation utilities
export const isValidHop = (hop) => hop && hop.name && hop.source;
export const isValidAroma = (aroma) => aroma && typeof aroma === 'object';

// URL utilities
export const updateURL = (hops) => {
  const url = new URL(window.location);
  if (hops?.length > 0) {
    url.searchParams.set('hops', hops.join(','));
  } else {
    url.searchParams.delete('hops');
  }
  window.history.replaceState({}, '', url);
};

export const loadFromURL = () => {
  const url = new URL(window.location);
  const hopsParam = url.searchParams.get('hops');
  return hopsParam ? hopsParam.split(',').filter(Boolean) : [];
};
