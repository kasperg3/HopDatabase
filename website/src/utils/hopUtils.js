import { 
  ALPHA_THRESHOLDS, 
  OIL_THRESHOLDS, 
  COHUMULONE_THRESHOLDS, 
  BETA_ALPHA_THRESHOLDS,
  NORMALIZATION_SCALES 
} from './hopConstants';

// Helper functions for parsing and calculating hop values
export const parseValue = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Specific parser for oil values to handle unit consistency
export const parseOilValue = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle both "1.5" and "1.5 mL/100g" formats
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const getAverageValue = (from, to, isOil = false) => {
  const parseFunc = isOil ? parseOilValue : parseValue;
  const fromVal = parseFunc(from);
  const toVal = parseFunc(to);
  if (fromVal === 0 && toVal === 0) return 0;
  if (toVal === 0) return fromVal;
  if (fromVal === 0) return toVal;
  return (fromVal + toVal) / 2;
};

export const formatRange = (from, to, unit = '%') => {
  const fromVal = parseValue(from);
  const toVal = parseValue(to);
  
  if (fromVal === 0 && toVal === 0) return 'N/A';
  if (fromVal === toVal) return `${fromVal}${unit}`;
  if (toVal === 0) return `${fromVal}${unit}`;
  if (fromVal === 0) return `${toVal}${unit}`;
  return `${fromVal} - ${toVal}${unit}`;
};

// Advanced classification functions
export const getAlphaClassification = (avgAlpha) => {
  if (avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA) return { label: 'Super-Alpha', color: 'red', description: 'Maximum bittering efficiency' };
  if (avgAlpha >= ALPHA_THRESHOLDS.HIGH) return { label: 'High Alpha', color: 'orange', description: 'Efficient bittering' };
  if (avgAlpha >= ALPHA_THRESHOLDS.MEDIUM) return { label: 'Medium Alpha', color: 'yellow', description: 'Balanced bittering' };
  if (avgAlpha >= ALPHA_THRESHOLDS.LOW) return { label: 'Low Alpha', color: 'green', description: 'Aroma-focused' };
  return { label: 'Noble/Very Low', color: 'teal', description: 'Traditional aroma' };
};

export const getOilClassification = (avgOil) => {
  if (avgOil >= OIL_THRESHOLDS.VERY_HIGH) return { label: 'Very High', color: 'blue', description: 'Exceptional aroma potential' };
  if (avgOil >= OIL_THRESHOLDS.HIGH) return { label: 'High', color: 'cyan', description: 'Strong aroma character' };
  if (avgOil >= OIL_THRESHOLDS.MEDIUM) return { label: 'Medium', color: 'grape', description: 'Moderate aroma' };
  return { label: 'Low', color: 'gray', description: 'Subtle aroma' };
};

export const getCohumuloneClassification = (avgCohumulone) => {
  if (avgCohumulone === 0) return { label: 'Unknown', color: 'gray', description: 'Data not available' };
  if (avgCohumulone > COHUMULONE_THRESHOLDS.HIGH) return { label: 'High Yield', color: 'yellow', description: '+15-25% more IBUs than predicted' };
  if (avgCohumulone < COHUMULONE_THRESHOLDS.LOW) return { label: 'Low Yield', color: 'blue', description: 'May yield fewer IBUs' };
  return { label: 'Standard', color: 'green', description: 'Standard IBU prediction' };
};

export const getBetaAlphaClassification = (ratio) => {
  if (ratio >= BETA_ALPHA_THRESHOLDS.AGING_POTENTIAL) return { label: 'Aging+', color: 'orange', description: 'May develop pleasant aged character' };
  if (ratio >= BETA_ALPHA_THRESHOLDS.STABLE) return { label: 'Stable', color: 'blue', description: 'Good bitterness stability' };
  if (ratio < 0.5) return { label: 'Rapid Loss', color: 'red', description: 'Rapid alpha degradation' };
  return { label: 'Standard', color: 'gray', description: 'Normal degradation rate' };
};

export const getHopPurpose = (avgAlpha, avgOil, avgBeta) => {
  if (avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA) {
    return { label: 'Super-Alpha', color: 'red', description: 'Maximum bittering efficiency' };
  }
  if (avgAlpha <= ALPHA_THRESHOLDS.VERY_LOW && avgOil <= OIL_THRESHOLDS.LOW) {
    return { label: 'Noble/Aroma', color: 'teal', description: 'Traditional European character' };
  }
  if (avgAlpha <= ALPHA_THRESHOLDS.MEDIUM && avgOil >= OIL_THRESHOLDS.HIGH) {
    return { label: 'Modern Aroma', color: 'cyan', description: 'Contemporary aromatics' };
  }
  if (avgAlpha >= ALPHA_THRESHOLDS.HIGH && avgOil < OIL_THRESHOLDS.HIGH) {
    return { label: 'Bittering', color: 'orange', description: 'Efficient bittering' };
  }
  return { label: 'Dual-Purpose', color: 'violet', description: 'Versatile applications' };
};

// Normalization functions for chart data
export const normalizeAlpha = (value) => Math.min((parseValue(value) / NORMALIZATION_SCALES.ALPHA_MAX) * 10, 10);
export const normalizeBeta = (value) => Math.min((parseValue(value) / NORMALIZATION_SCALES.BETA_MAX) * 10, 10);
export const normalizeOil = (value) => Math.min((parseValue(value) / NORMALIZATION_SCALES.OIL_MAX) * 10, 10);
export const normalizeCohumulone = (value) => Math.min((parseValue(value) / NORMALIZATION_SCALES.COHUMULONE_MAX) * 10, 10);
export const normalizeBetaAlpha = (value) => Math.min((parseValue(value) / NORMALIZATION_SCALES.BETA_ALPHA_RATIO_MAX) * 10, 10);

// Natural language helpers
function joinNatural(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

/**
 * Generate a natural-language sensory description from a hop's aromas and notes.
 * Returns empty string if no data is available.
 */
export function generateSensoryDescription(hop) {
  const aromaEntries = Object.entries(hop.aromas || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const dominant = aromaEntries.filter(([, v]) => v >= 2.5);
  const moderate = aromaEntries.filter(([, v]) => v >= 1.0 && v < 2.5);
  const notes = hop.notes || [];

  // Fallback: no aroma data at all
  if (aromaEntries.length === 0) {
    return notes.length > 0 ? `Flavor notes: ${notes.join(', ')}.` : '';
  }

  const parts = [];

  if (dominant.length > 0) {
    const names = dominant.map(([k]) => k.toLowerCase());
    parts.push(`Bold ${joinNatural(names)} character`);
    if (moderate.length > 0) {
      const modNames = moderate.slice(0, 3).map(([k]) => k.toLowerCase());
      parts.push(`with ${joinNatural(modNames)} undertones`);
    }
  } else if (moderate.length > 0) {
    const names = moderate.slice(0, 3).map(([k]) => k.toLowerCase());
    parts.push(`Moderate ${joinNatural(names)} character`);
  }

  const aromaDesc = parts.join(' ');
  if (notes.length > 0) {
    const noteStr = notes.slice(0, 5).join(', ');
    return aromaDesc
      ? `${aromaDesc}. Key notes: ${noteStr}.`
      : `Flavor notes: ${noteStr}.`;
  }

  return aromaDesc ? `${aromaDesc}.` : '';
}

// Process hop data with all analysis
export const processHopData = (hopData) => {
  return hopData.map((hop, index) => {
    const avgAlpha = getAverageValue(hop.alpha_from, hop.alpha_to);
    const avgBeta = getAverageValue(hop.beta_from, hop.beta_to);
    const avgOil = getAverageValue(hop.oil_from, hop.oil_to, true);
    const avgCohumulone = getAverageValue(hop.co_h_from, hop.co_h_to);
    const betaAlphaRatio = avgAlpha > 0 ? avgBeta / avgAlpha : 0;

    return {
      ...hop,
      index,
      uniqueId: `${hop.name} (${hop.source})`,
      displayName: hop.name,
      avgAlpha,
      avgBeta,
      avgOil,
      avgCohumulone,
      betaAlphaRatio,
      alphaClass: getAlphaClassification(avgAlpha),
      oilClass: getOilClassification(avgOil),
      cohumuloneClass: getCohumuloneClassification(avgCohumulone),
      betaAlphaClass: getBetaAlphaClassification(betaAlphaRatio),
      purpose: getHopPurpose(avgAlpha, avgOil, avgBeta),
    };
  });
};
