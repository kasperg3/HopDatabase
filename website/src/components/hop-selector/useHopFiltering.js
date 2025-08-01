import { useState, useMemo, useCallback } from 'react';
import { 
  getAverageValue, 
  getHopPurpose, 
  getCohumuloneClassification, 
  getBetaAlphaClassification,
  hasAllZeroAromas,
  getTopAromas,
  getBottomAromas,
} from './utils';
import { 
  ALPHA_THRESHOLDS, 
  COHUMULONE_THRESHOLDS, 
  OIL_THRESHOLDS,
  ALPHA_CHIP_STATES,
  COHUMULONE_CHIP_STATES,
  OIL_CHIP_STATES,
} from './constants';

export const useHopFiltering = (hopData) => {
  // Filter states
  const [aromaStates, setAromaStates] = useState({}); // { aromaName: 'none' | 'high' | 'low' }
  
  // Brewing parameter filters
  const [alphaRange, setAlphaRange] = useState([0, 25]);
  const [cohumuloneRange, setCohumuloneRange] = useState([0, 50]);
  const [oilRange, setOilRange] = useState([0, 4]);
  const [useAlphaFilter, setUseAlphaFilter] = useState(false);
  const [useCohumuloneFilter, setUseCohumuloneFilter] = useState(false);
  const [useOilFilter, setUseOilFilter] = useState(false);
  
  // Threshold-based filter presets
  const [alphaThreshold, setAlphaThreshold] = useState('');
  const [cohumuloneThreshold, setCohumuloneThreshold] = useState('');
  const [oilThreshold, setOilThreshold] = useState('');
  
  // Custom ranges display state
  const [showCustomRanges, setShowCustomRanges] = useState(false);
  
  // Helper functions for aroma states
  const getSelectedAromasHigh = useCallback(() => {
    return Object.entries(aromaStates)
      .filter(([_, state]) => state === 'high')
      .map(([aroma, _]) => aroma);
  }, [aromaStates]);

  const getSelectedAromasLow = useCallback(() => {
    return Object.entries(aromaStates)
      .filter(([_, state]) => state === 'low')
      .map(([aroma, _]) => aroma);
  }, [aromaStates]);

  const getAllSelectedAromas = useCallback(() => {
    return Object.entries(aromaStates)
      .filter(([_, state]) => state !== 'none')
      .map(([aroma, _]) => aroma);
  }, [aromaStates]);

  const handleAromaClick = (aroma) => {
    setAromaStates(prev => {
      const currentState = prev[aroma] || 'none';
      let newState;
      
      // Cycle through: none -> high -> low -> none
      switch (currentState) {
        case 'none':
          newState = 'high';
          break;
        case 'high':
          newState = 'low';
          break;
        case 'low':
          newState = 'none';
          break;
        default:
          newState = 'none';
      }
      
      return {
        ...prev,
        [aroma]: newState
      };
    });
  };

  // Helper functions to cycle through chip states
  const cycleAlphaThreshold = () => {
    const currentIndex = ALPHA_CHIP_STATES.indexOf(alphaThreshold);
    const nextIndex = (currentIndex + 1) % ALPHA_CHIP_STATES.length;
    const nextThreshold = ALPHA_CHIP_STATES[nextIndex];
    applyAlphaThreshold(nextThreshold);
  };

  const cycleCohumuloneThreshold = () => {
    const currentIndex = COHUMULONE_CHIP_STATES.indexOf(cohumuloneThreshold);
    const nextIndex = (currentIndex + 1) % COHUMULONE_CHIP_STATES.length;
    const nextThreshold = COHUMULONE_CHIP_STATES[nextIndex];
    applyCohumuloneThreshold(nextThreshold);
  };

  const cycleOilThreshold = () => {
    const currentIndex = OIL_CHIP_STATES.indexOf(oilThreshold);
    const nextIndex = (currentIndex + 1) % OIL_CHIP_STATES.length;
    const nextThreshold = OIL_CHIP_STATES[nextIndex];
    applyOilThreshold(nextThreshold);
  };

  // Helper functions to apply threshold presets
  const applyAlphaThreshold = (threshold) => {
    setAlphaThreshold(threshold);
    setUseAlphaFilter(true);
    
    switch (threshold) {
      case 'SUPER_ALPHA':
        setAlphaRange([ALPHA_THRESHOLDS.SUPER_ALPHA, 25]);
        break;
      case 'HIGH':
        setAlphaRange([ALPHA_THRESHOLDS.HIGH, ALPHA_THRESHOLDS.SUPER_ALPHA - 0.1]);
        break;
      case 'MEDIUM':
        setAlphaRange([ALPHA_THRESHOLDS.MEDIUM, ALPHA_THRESHOLDS.HIGH - 0.1]);
        break;
      case 'LOW':
        setAlphaRange([ALPHA_THRESHOLDS.VERY_LOW, ALPHA_THRESHOLDS.MEDIUM - 0.1]);
        break;
      case 'VERY_LOW':
        setAlphaRange([0, ALPHA_THRESHOLDS.VERY_LOW - 0.1]);
        break;
      default:
        setAlphaRange([0, 25]);
        setUseAlphaFilter(false);
        setAlphaThreshold('');
    }
  };

  const applyCohumuloneThreshold = (threshold) => {
    setCohumuloneThreshold(threshold);
    setUseCohumuloneFilter(true);
    
    switch (threshold) {
      case 'HIGH':
        setCohumuloneRange([COHUMULONE_THRESHOLDS.HIGH, 50]);
        break;
      case 'STANDARD':
        setCohumuloneRange([COHUMULONE_THRESHOLDS.LOW, COHUMULONE_THRESHOLDS.HIGH - 0.1]);
        break;
      case 'LOW':
        setCohumuloneRange([0, COHUMULONE_THRESHOLDS.LOW - 0.1]);
        break;
      default:
        setCohumuloneRange([0, 50]);
        setUseCohumuloneFilter(false);
        setCohumuloneThreshold('');
    }
  };

  const applyOilThreshold = (threshold) => {
    setOilThreshold(threshold);
    setUseOilFilter(true);
    
    switch (threshold) {
      case 'VERY_HIGH':
        setOilRange([OIL_THRESHOLDS.VERY_HIGH, 4]);
        break;
      case 'HIGH':
        setOilRange([OIL_THRESHOLDS.HIGH, Math.round((OIL_THRESHOLDS.VERY_HIGH - 0.1) * 10) / 10]);
        break;
      case 'MEDIUM':
        setOilRange([OIL_THRESHOLDS.MEDIUM, Math.round((OIL_THRESHOLDS.HIGH - 0.1) * 10) / 10]);
        break;
      case 'LOW':
        setOilRange([OIL_THRESHOLDS.LOW, Math.round((OIL_THRESHOLDS.MEDIUM - 0.1) * 10) / 10]);
        break;
      case 'VERY_LOW':
        setOilRange([0, Math.round((OIL_THRESHOLDS.LOW - 0.1) * 10) / 10]);
        break;
      default:
        setOilRange([0, 4]);
        setUseOilFilter(false);
        setOilThreshold('');
    }
  };

  // Create unique hop entries with enhanced data processing
  const uniqueHops = useMemo(() => {
    return hopData.map(hop => {
      const avgAlpha = getAverageValue(hop.alpha_from, hop.alpha_to);
      const avgBeta = getAverageValue(hop.beta_from, hop.beta_to);
      const avgOil = getAverageValue(hop.oil_from, hop.oil_to, true); // Use oil parser
      const avgCohumulone = getAverageValue(hop.co_h_from, hop.co_h_to);
      const betaAlphaRatio = avgAlpha > 0 ? avgBeta / avgAlpha : 0;

      return {
        ...hop,
        uniqueId: `${hop.name} (${hop.source})`,
        displayName: hop.name,
        avgAlpha,
        avgBeta,
        avgOil,
        avgCohumulone,
        betaAlphaRatio,
        purpose: getHopPurpose(avgAlpha, avgOil, avgBeta),
        cohumuloneClass: getCohumuloneClassification(avgCohumulone),
        betaAlphaClass: getBetaAlphaClassification(betaAlphaRatio),
      };
    });
  }, [hopData]);

  // Extract standardized aroma categories for filtering
  const availableAromaCategories = useMemo(() => {
    const aromaCategories = new Set();
    
    hopData.forEach(hop => {
      if (hop.aromas && typeof hop.aromas === 'object') {
        Object.keys(hop.aromas).forEach(category => {
          aromaCategories.add(category);
        });
      }
    });
    
    return Array.from(aromaCategories).sort();
  }, [hopData]);

  // Filter hops based on selected aroma categories and brewing parameters
  const filteredHops = useMemo(() => {
    let filtered = uniqueHops;
    
    // Get selected aromas from the state
    const selectedAromasHigh = getSelectedAromasHigh();
    const selectedAromasLow = getSelectedAromasLow();
    const allSelectedAromas = getAllSelectedAromas();
    
    // Filter by selected aroma categories
    if (allSelectedAromas.length > 0) {
      filtered = filtered.filter(hop => {
        const topAromas = getTopAromas(hop, 3);
        const topAromaCategories = topAromas.map(aroma => aroma.category);
        
        const bottomAromas = getBottomAromas(hop, 3);
        const bottomAromaCategories = bottomAromas.map(aroma => aroma.category);
        
        // For high aromas: must be in top 3 (AND logic)
        const highAromasMatch = selectedAromasHigh.length === 0 || 
          selectedAromasHigh.every(selectedAroma => topAromaCategories.includes(selectedAroma));
        
        // For low aromas: must be in bottom 3 (AND logic)
        const lowAromasMatch = selectedAromasLow.length === 0 || 
          selectedAromasLow.every(selectedAroma => bottomAromaCategories.includes(selectedAroma));
        
        return highAromasMatch && lowAromasMatch;
      });
    }
    
    // Filter by brewing parameters
    if (useAlphaFilter || useCohumuloneFilter || useOilFilter) {
      filtered = filtered.filter(hop => {
        let matches = true;
        
        // Alpha acid filter
        if (useAlphaFilter) {
          const avgAlpha = hop.avgAlpha || 0;
          matches = matches && avgAlpha >= alphaRange[0] && avgAlpha <= alphaRange[1];
        }
        
        // Cohumulone filter
        if (useCohumuloneFilter) {
          const avgCohumulone = hop.avgCohumulone || 0;
          matches = matches && avgCohumulone >= cohumuloneRange[0] && avgCohumulone <= cohumuloneRange[1];
        }
        
        // Oil filter
        if (useOilFilter) {
          const avgOil = hop.avgOil || 0;
          matches = matches && avgOil >= oilRange[0] && avgOil <= oilRange[1];
        }
        
        return matches;
      });
    }
    
    // Sort by aroma intensities with improved balanced approach
    if (allSelectedAromas.length > 0) {
      return filtered.sort((a, b) => {
        // Check if either hop has all zero aromas - place those at the bottom
        const aHasAllZero = hasAllZeroAromas(a);
        const bHasAllZero = hasAllZeroAromas(b);
        
        // If one has all zero aromas and the other doesn't, put the zero one last
        if (aHasAllZero && !bHasAllZero) return 1;
        if (!aHasAllZero && bHasAllZero) return -1;
        
        // If both have all zero aromas, sort by name
        if (aHasAllZero && bHasAllZero) {
          return a.displayName.localeCompare(b.displayName);
        }
        
        // Normal sorting for hops with non-zero aromas
        // Calculate sums for high priority (green) aromas
        const sumHighA = selectedAromasHigh.reduce((acc, aroma) => acc + (a.aromas?.[aroma] || 0), 0);
        const sumHighB = selectedAromasHigh.reduce((acc, aroma) => acc + (b.aromas?.[aroma] || 0), 0);
        
        // Calculate sums for low priority (red) aromas  
        const sumLowA = selectedAromasLow.reduce((acc, aroma) => acc + (a.aromas?.[aroma] || 0), 0);
        const sumLowB = selectedAromasLow.reduce((acc, aroma) => acc + (b.aromas?.[aroma] || 0), 0);
        
        // If only high priority aromas are selected, sort by them directly
        if (selectedAromasHigh.length > 0 && selectedAromasLow.length === 0) {
          if (Math.abs(sumHighB - sumHighA) > 0.01) {
            return sumHighB - sumHighA;
          }
          return a.displayName.localeCompare(b.displayName);
        }
        
        // If only low priority aromas are selected, sort by them directly
        if (selectedAromasLow.length > 0 && selectedAromasHigh.length === 0) {
          if (Math.abs(sumLowA - sumLowB) > 0.01) {
            return sumLowA - sumLowB;
          }
          return a.displayName.localeCompare(b.displayName);
        }
        
        // When both high and low priority aromas are selected, use an adaptive weighted approach
        if (selectedAromasHigh.length > 0 && selectedAromasLow.length > 0) {
          // Normalize by the number of selected aromas
          const normalizedHighA = sumHighA / selectedAromasHigh.length;
          const normalizedHighB = sumHighB / selectedAromasHigh.length;
          const normalizedLowA = sumLowA / selectedAromasLow.length;
          const normalizedLowB = sumLowB / selectedAromasLow.length;
          
          // Calculate the relative differences
          const highDiff = Math.abs(normalizedHighB - normalizedHighA);
          const lowDiff = Math.abs(normalizedLowB - normalizedLowA);
          
          // Define thresholds for "significant" differences
          const significantHighThreshold = 1.5;
          const significantLowThreshold = 1.0;
          
          // If high difference is significant, prioritize high aromas
          if (highDiff >= significantHighThreshold) {
            return sumHighB - sumHighA;
          }
          
          // If low difference is significant and high difference is small, prioritize low aromas
          if (lowDiff >= significantLowThreshold && highDiff < significantHighThreshold) {
            return sumLowA - sumLowB;
          }
          
          // If both differences are small or similar, use balanced weighting
          let highWeight = 1.0;
          let lowWeight = 1.0;
          
          // If low difference is larger than high difference, give more weight to low priority
          if (lowDiff > highDiff) {
            lowWeight = 1.5;
            highWeight = 0.8;
          } else if (highDiff > lowDiff) {
            highWeight = 1.5;
            lowWeight = 0.8;
          }
          
          // Calculate weighted composite score (higher is better)
          const maxAromaValue = 8;
          const scoreA = (highWeight * normalizedHighA) + (lowWeight * (maxAromaValue - normalizedLowA));
          const scoreB = (highWeight * normalizedHighB) + (lowWeight * (maxAromaValue - normalizedLowB));
          
          // Sort by composite score (descending - highest score first)
          if (Math.abs(scoreB - scoreA) > 0.1) {
            return scoreB - scoreA;
          }
          
          // If composite scores are very close, fall back to direct comparison
          if (Math.abs(sumHighB - sumHighA) > 0.01) {
            return sumHighB - sumHighA;
          }
          
          if (Math.abs(sumLowA - sumLowB) > 0.01) {
            return sumLowA - sumLowB;
          }
        }
        
        // Fallback to displayName
        return a.displayName.localeCompare(b.displayName);
      });
    }
    // Default sort by displayName (alphabetical order when no filters are active)
    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [uniqueHops, useAlphaFilter, useCohumuloneFilter, useOilFilter, alphaRange, cohumuloneRange, oilRange, getAllSelectedAromas, getSelectedAromasHigh, getSelectedAromasLow]);

  // Clear all filters
  const clearAllFilters = () => {
    setAromaStates({});
    setUseAlphaFilter(false);
    setUseCohumuloneFilter(false);
    setUseOilFilter(false);
    setAlphaRange([0, 25]);
    setCohumuloneRange([0, 50]);
    setOilRange([0, 4]);
    setAlphaThreshold('');
    setCohumuloneThreshold('');
    setOilThreshold('');
    setShowCustomRanges(false);
  };

  return {
    // State
    aromaStates,
    alphaRange,
    cohumuloneRange,
    oilRange,
    useAlphaFilter,
    useCohumuloneFilter,
    useOilFilter,
    alphaThreshold,
    cohumuloneThreshold,
    oilThreshold,
    showCustomRanges,
    
    // Setters
    setAromaStates,
    setAlphaRange,
    setCohumuloneRange,
    setOilRange,
    setUseAlphaFilter,
    setUseCohumuloneFilter,
    setUseOilFilter,
    setAlphaThreshold,
    setCohumuloneThreshold,
    setOilThreshold,
    setShowCustomRanges,
    
    // Computed values
    uniqueHops,
    filteredHops,
    availableAromaCategories,
    
    // Helper functions
    getSelectedAromasHigh,
    getSelectedAromasLow,
    getAllSelectedAromas,
    handleAromaClick,
    cycleAlphaThreshold,
    cycleCohumuloneThreshold,
    cycleOilThreshold,
    clearAllFilters,
  };
};
