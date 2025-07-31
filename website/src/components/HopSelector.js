import React, { useState, useMemo } from 'react';
import {
  Paper,
  Text,
  Box,
  MultiSelect,
  Badge,
  Stack,
  Group,
  ThemeIcon,
  Card,
  Grid,
  Tooltip,
  Divider,
  useMantineColorScheme,
  Collapse,
  Button,
  Modal,
  Tabs,
  Flex,
  RangeSlider,
  NumberInput,
} from '@mantine/core';
import {
  IconFlask,
  IconDroplet,
  IconChartBar,
  IconTarget,
  IconShieldCheck,
  IconScale,
  IconLeaf,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconHelp,
  IconBook,
  IconBeer,
} from '@tabler/icons-react';

// Advanced classification functions based on modern hop science
const ALPHA_THRESHOLDS = {
  SUPER_ALPHA: 11,
  HIGH: 8,
  MEDIUM: 5,
  LOW: 3,
  VERY_LOW: 3,
};

const OIL_THRESHOLDS = {
  VERY_HIGH: 2.5,
  HIGH: 1.5,
  MEDIUM: 0.8,
  LOW: 0.4,
};

const COHUMULONE_THRESHOLDS = {
  HIGH: 34,
  LOW: 25,
};

const BETA_ALPHA_THRESHOLDS = {
  STABLE: 0.8,
  AGING_POTENTIAL: 0.9,
};

const HopSelector = ({ 
  hopData, 
  selectedHops, 
  onHopSelection
}) => {
  const { colorScheme } = useMantineColorScheme();
  
  // Filter states
  const [aromaStates, setAromaStates] = useState({}); // { aromaName: 'none' | 'high' | 'low' }
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  
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
  
  // Chip cycling arrays for different filter types
  const alphaChipStates = ['', 'SUPER_ALPHA', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'];
  const cohumuloneChipStates = ['', 'HIGH', 'STANDARD', 'LOW'];
  const oilChipStates = ['', 'VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'];
  
  // Helper functions to cycle through chip states
  const cycleAlphaThreshold = () => {
    const currentIndex = alphaChipStates.indexOf(alphaThreshold);
    const nextIndex = (currentIndex + 1) % alphaChipStates.length;
    const nextThreshold = alphaChipStates[nextIndex];
    applyAlphaThreshold(nextThreshold);
  };

  const cycleCohumuloneThreshold = () => {
    const currentIndex = cohumuloneChipStates.indexOf(cohumuloneThreshold);
    const nextIndex = (currentIndex + 1) % cohumuloneChipStates.length;
    const nextThreshold = cohumuloneChipStates[nextIndex];
    applyCohumuloneThreshold(nextThreshold);
  };

  const cycleOilThreshold = () => {
    const currentIndex = oilChipStates.indexOf(oilThreshold);
    const nextIndex = (currentIndex + 1) % oilChipStates.length;
    const nextThreshold = oilChipStates[nextIndex];
    applyOilThreshold(nextThreshold);
  };

  // Helper functions to get chip display info
  const getAlphaChipInfo = () => {
    switch (alphaThreshold) {
      case 'SUPER_ALPHA':
        return { label: `Super-Alpha (≥${ALPHA_THRESHOLDS.SUPER_ALPHA}%)`, color: 'red' };
      case 'HIGH':
        return { label: `High (${ALPHA_THRESHOLDS.HIGH}-${ALPHA_THRESHOLDS.SUPER_ALPHA - 0.1}%)`, color: 'orange' };
      case 'MEDIUM':
        return { label: `Medium (${ALPHA_THRESHOLDS.MEDIUM}-${ALPHA_THRESHOLDS.HIGH - 0.1}%)`, color: 'yellow' };
      case 'LOW':
        return { label: `Low (${ALPHA_THRESHOLDS.VERY_LOW}-${ALPHA_THRESHOLDS.MEDIUM - 0.1}%)`, color: 'blue' };
      case 'VERY_LOW':
        return { label: `Very Low (<${ALPHA_THRESHOLDS.VERY_LOW}%)`, color: 'teal' };
      default:
        return { label: 'Alpha Acids', color: 'gray' };
    }
  };

  const getCohumuloneChipInfo = () => {
    switch (cohumuloneThreshold) {
      case 'HIGH':
        return { label: `High IBU (≥${COHUMULONE_THRESHOLDS.HIGH}%)`, color: 'yellow' };
      case 'STANDARD':
        return { label: `Standard (${COHUMULONE_THRESHOLDS.LOW}-${COHUMULONE_THRESHOLDS.HIGH - 0.1}%)`, color: 'green' };
      case 'LOW':
        return { label: `Low IBU (<${COHUMULONE_THRESHOLDS.LOW}%)`, color: 'blue' };
      default:
        return { label: 'Cohumulone', color: 'gray' };
    }
  };

  const getOilChipInfo = () => {
    switch (oilThreshold) {
      case 'VERY_HIGH':
        return { label: `Very High (≥${OIL_THRESHOLDS.VERY_HIGH})`, color: 'grape' };
      case 'HIGH':
        return { label: `High (${OIL_THRESHOLDS.HIGH}-${OIL_THRESHOLDS.VERY_HIGH - 0.1})`, color: 'violet' };
      case 'MEDIUM':
        return { label: `Medium (${OIL_THRESHOLDS.MEDIUM}-${OIL_THRESHOLDS.HIGH - 0.1})`, color: 'blue' };
      case 'LOW':
        return { label: `Low (${OIL_THRESHOLDS.LOW}-${OIL_THRESHOLDS.MEDIUM - 0.1})`, color: 'cyan' };
      case 'VERY_LOW':
        return { label: `Very Low (<${OIL_THRESHOLDS.LOW})`, color: 'gray' };
      default:
        return { label: 'Oil Content', color: 'gray' };
    }
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
        setOilRange([OIL_THRESHOLDS.HIGH, OIL_THRESHOLDS.VERY_HIGH - 0.1]);
        break;
      case 'MEDIUM':
        setOilRange([OIL_THRESHOLDS.MEDIUM, OIL_THRESHOLDS.HIGH - 0.1]);
        break;
      case 'LOW':
        setOilRange([OIL_THRESHOLDS.LOW, OIL_THRESHOLDS.MEDIUM - 0.1]);
        break;
      case 'VERY_LOW':
        setOilRange([0, OIL_THRESHOLDS.LOW - 0.1]);
        break;
      default:
        setOilRange([0, 4]);
        setUseOilFilter(false);
        setOilThreshold('');
    }
  };
  
  // Helper functions
  const parseValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Specific parser for oil values to handle unit consistency
  const parseOilValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle both "1.5" and "1.5 mL/100g" formats
      // Both should be treated as mL/100g values
      const cleaned = value.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getAverageValue = (from, to, isOil = false) => {
    const parseFunc = isOil ? parseOilValue : parseValue;
    const fromVal = parseFunc(from);
    const toVal = parseFunc(to);
    if (fromVal === 0 && toVal === 0) return 0;
    if (toVal === 0) return fromVal;
    if (fromVal === 0) return toVal;
    return (fromVal + toVal) / 2;
  };

  const formatRange = (from, to, unit = '%', isOil = false) => {
    const parseFunc = isOil ? parseOilValue : parseValue;
    const fromVal = parseFunc(from);
    const toVal = parseFunc(to);
    
    if (fromVal === 0 && toVal === 0) return 'N/A';
    if (fromVal === toVal) return `${fromVal}${unit}`;
    if (toVal === 0) return `${fromVal}${unit}`;
    if (fromVal === 0) return `${toVal}${unit}`;
    return `${fromVal} - ${toVal}${unit}`;
  };

  // Advanced classification functions
  const getHopPurpose = (avgAlpha, avgOil, avgBeta) => {
    if (avgAlpha >= ALPHA_THRESHOLDS.SUPER_ALPHA) {
      return { label: 'Super-Alpha', color: 'red', icon: IconFlask, description: 'Maximum bittering efficiency' };
    }
    if (avgAlpha <= ALPHA_THRESHOLDS.VERY_LOW && avgOil <= OIL_THRESHOLDS.LOW) {
      return { label: 'Noble/Aroma', color: 'teal', icon: IconDroplet, description: 'Traditional European character' };
    }
    if (avgAlpha <= ALPHA_THRESHOLDS.MEDIUM && avgOil >= OIL_THRESHOLDS.HIGH) {
      return { label: 'Modern Aroma', color: 'cyan', icon: IconDroplet, description: 'Contemporary aromatics' };
    }
    if (avgAlpha >= ALPHA_THRESHOLDS.HIGH && avgOil < OIL_THRESHOLDS.HIGH) {
      return { label: 'Bittering', color: 'orange', icon: IconFlask, description: 'Efficient bittering' };
    }
    return { label: 'Dual-Purpose', color: 'violet', icon: IconTarget, description: 'Versatile applications' };
  };

  const getCohumuloneClassification = (avgCohumulone) => {
    if (avgCohumulone === 0) return { label: 'Unknown', color: 'gray', description: 'Data not available' };
    if (avgCohumulone > COHUMULONE_THRESHOLDS.HIGH) return { label: 'High IBU Yield', color: 'yellow', description: '+15-25% more IBUs than predicted' };
    if (avgCohumulone < COHUMULONE_THRESHOLDS.LOW) return { label: 'Low IBU Yield', color: 'blue', description: 'May yield fewer IBUs' };
    return { label: 'Standard IBUs', color: 'green', description: 'Standard IBU prediction' };
  };

  const getBetaAlphaClassification = (ratio) => {
    if (ratio >= BETA_ALPHA_THRESHOLDS.AGING_POTENTIAL) return { label: 'Aging Potential', color: 'orange', description: 'May develop pleasant aged character' };
    if (ratio >= BETA_ALPHA_THRESHOLDS.STABLE) return { label: 'Storage Stable', color: 'blue', description: 'Good bitterness stability' };
    if (ratio < 0.5) return { label: 'Use Fresh', color: 'red', description: 'Rapid alpha degradation' };
    return { label: 'Standard Storage', color: 'gray', description: 'Normal degradation rate' };
  };
  // Helper functions for aroma states
  const getSelectedAromasHigh = () => {
    return Object.entries(aromaStates)
      .filter(([_, state]) => state === 'high')
      .map(([aroma, _]) => aroma);
  };

  const getSelectedAromasLow = () => {
    return Object.entries(aromaStates)
      .filter(([_, state]) => state === 'low')
      .map(([aroma, _]) => aroma);
  };

  const getAllSelectedAromas = () => {
    return Object.entries(aromaStates)
      .filter(([_, state]) => state !== 'none')
      .map(([aroma, _]) => aroma);
  };

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
  // Helper function to get bottom 3 aromas for a hop (including all ties with 3rd place)
  const getBottomAromas = (hop, count = 3) => {
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
  const getTopAromas = (hop, count = 3) => {
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

  // Create unique hop entries with enhanced data processing
  const uniqueHops = hopData.map(hop => {
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

  // Extract standardized aroma categories for filtering (include all aroma categories)
  const availableAromaCategories = useMemo(() => {
    const aromaCategories = new Set();
    
    // Collect all aroma categories (including those with 0 intensity)
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
          const avgAlpha = hop.avgAlpha;
          matches = matches && avgAlpha >= alphaRange[0] && avgAlpha <= alphaRange[1];
        }
        
        // Cohumulone filter
        if (useCohumuloneFilter) {
          const avgCohumulone = hop.avgCohumulone;
          // Only filter if the hop has cohumulone data (> 0)
          if (avgCohumulone > 0) {
            matches = matches && avgCohumulone >= cohumuloneRange[0] && avgCohumulone <= cohumuloneRange[1];
          } else {
            // If hop has no cohumulone data and filter is active, exclude it
            matches = false;
          }
        }
        
        // Oil filter
        if (useOilFilter) {
          const avgOil = hop.avgOil;
          // Only filter if the hop has oil data (> 0)
          if (avgOil > 0) {
            matches = matches && avgOil >= oilRange[0] && avgOil <= oilRange[1];
          } else {
            // If hop has no oil data and filter is active, exclude it
            matches = false;
          }
        }
        
        return matches;
      });
    }
    
    // Sort by aroma intensities with green (high) taking precedence over red (low)
    if (allSelectedAromas.length > 0) {
      return filtered.sort((a, b) => {
        // Calculate sums for high priority (green) aromas
        const sumHighA = selectedAromasHigh.reduce((acc, aroma) => acc + (a.aromas?.[aroma] || 0), 0);
        const sumHighB = selectedAromasHigh.reduce((acc, aroma) => acc + (b.aromas?.[aroma] || 0), 0);
        
        // If high priority aromas are different, sort by them (descending - highest first)
        if (sumHighB !== sumHighA) {
          return sumHighB - sumHighA;
        }
        
        // If high priority aromas are equal, sort by low priority (red) aromas
        const sumLowA = selectedAromasLow.reduce((acc, aroma) => acc + (a.aromas?.[aroma] || 0), 0);
        const sumLowB = selectedAromasLow.reduce((acc, aroma) => acc + (b.aromas?.[aroma] || 0), 0);
        
        // For low priority aromas, sort ascending (lowest first)
        if (sumLowA !== sumLowB) {
          return sumLowA - sumLowB;
        }
        
        // If all sums are equal, fallback to displayName
        return a.displayName.localeCompare(b.displayName);
      });
    }
    // Default sort by displayName
    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [uniqueHops, aromaStates, useAlphaFilter, useCohumuloneFilter, useOilFilter, alphaRange, cohumuloneRange, oilRange]);

  // Sort by display name for better UX
  const availableHops = filteredHops;

  // Generate aroma combination suggestions
  const getAllAromaCombinations = () => {
    return [
      // IPA Styles
      { aromas: ['Citrus', 'Tropical Fruit'], description: 'Modern American IPA character', style: 'American IPA', type: 'high', category: 'IPA' },
      { aromas: ['Berry', 'Stone Fruit'], description: 'New England IPA fruitiness', style: 'NEIPA', type: 'high', category: 'IPA' },
      { aromas: ['Resin/Pine'], description: 'West Coast IPA bitterness', style: 'West Coast IPA', type: 'high', category: 'IPA' },
      { aromas: ['Floral', 'Citrus'], description: 'Balanced aromatic profile', style: 'Session IPA', type: 'high', category: 'IPA' },
      { aromas: ['Citrus', 'Resin/Pine'], description: 'Cascade-style American hop blend', style: 'American Pale Ale', type: 'high', category: 'IPA' },
      { aromas: ['Tropical Fruit', 'Stone Fruit'], description: 'Modern hazy IPA profile', style: 'Hazy IPA', type: 'high', category: 'IPA' },
      { 
        aromasHigh: ['Berry', 'Stone Fruit'], 
        aromasLow: ['Spice', 'Herbal'], 
        description: 'Fruit-forward with minimal spice interference', 
        style: 'Fruit-Forward IPA', 
        type: 'mixed',
        category: 'IPA'
      },
      
      // European Styles
      { aromas: ['Floral', 'Spice'], description: 'Classic European noble hop profile', style: 'Pilsner/Lager', type: 'high', category: 'European' },
      { aromas: ['Herbal', 'Grassy'], description: 'Traditional lager character', style: 'European Lager', type: 'high', category: 'European' },
      { aromas: ['Grassy', 'Herbal'], description: 'Clean, subtle background for malt-forward styles', style: 'Märzen/Oktoberfest', type: 'low', category: 'European' },
      { aromas: ['Spice', 'Floral'], description: 'Minimal hop character for traditional styles', style: 'Vienna Lager', type: 'low', category: 'European' },
      { 
        aromasHigh: ['Citrus', 'Tropical Fruit'], 
        aromasLow: ['Grassy', 'Herbal'], 
        description: 'Bright citrus focus with clean, neutral base', 
        style: 'Modern Pilsner', 
        type: 'mixed',
        category: 'European'
      },
      { 
        aromasHigh: ['Floral'], 
        aromasLow: ['Resin/Pine', 'Herbal'], 
        description: 'Delicate floral character without harsh resins', 
        style: 'Noble Pale Ale', 
        type: 'mixed',
        category: 'European'
      },
      
      // Belgian Styles
      { aromas: ['Spice', 'Herbal'], description: 'Belgian-style complexity', style: 'Belgian Ales', type: 'high', category: 'Belgian' },
      { 
        aromasHigh: ['Spice'], 
        aromasLow: ['Citrus', 'Tropical Fruit'], 
        description: 'Spice character without tropical fruit interference', 
        style: 'Belgian IPA', 
        type: 'mixed',
        category: 'Belgian'
      },
      { aromas: ['Herbal', 'Spice'], description: 'Traditional Belgian earthiness', style: 'Belgian Dubbel', type: 'high', category: 'Belgian' },
      { aromas: ['Floral', 'Spice'], description: 'Refined Belgian character', style: 'Belgian Tripel', type: 'low', category: 'Belgian' },
      
      // English Styles
      { aromas: ['Herbal', 'Resin/Pine'], description: 'Understated earthiness for balanced ales', style: 'English Bitter', type: 'low', category: 'English' },
      { aromas: ['Resin/Pine', 'Herbal'], description: 'Restrained earthiness for porter base', style: 'Porter Base', type: 'low', category: 'English' },
      { aromas: ['Floral', 'Herbal'], description: 'Traditional English hop character', style: 'ESB', type: 'high', category: 'English' },
      { aromas: ['Herbal', 'Grassy'], description: 'Classic mild ale profile', style: 'English Mild', type: 'low', category: 'English' },
      
      // American Lagers
      { aromas: ['Grassy'], description: 'Clean, minimal hop character', style: 'American Lager', type: 'low', category: 'American' },
      { aromas: ['Citrus'], description: 'Light citrus character for cream ales', style: 'Cream Ale', type: 'low', category: 'American' },
      { aromas: ['Floral'], description: 'Delicate floral for wheat beers', style: 'American Wheat', type: 'low', category: 'American' },
      
      // German Styles
      { aromas: ['Herbal'], description: 'Very subtle hop presence for malt showcase', style: 'Doppelbock', type: 'low', category: 'German' },
      { aromas: ['Spice'], description: 'Traditional German hop spice', style: 'Kölsch', type: 'low', category: 'German' },
      { aromas: ['Floral', 'Spice'], description: 'Noble hop character', style: 'German Pilsner', type: 'high', category: 'German' },
      { aromas: ['Herbal', 'Spice'], description: 'Weizen hop balance', style: 'Hefeweizen', type: 'low', category: 'German' },
      
      // Specialty Styles
      { 
        aromasHigh: ['Resin/Pine'], 
        aromasLow: ['Floral', 'Berry'], 
        description: 'Clean pine bitterness without floral sweetness', 
        style: 'West Coast Clean', 
        type: 'mixed',
        category: 'Specialty'
      },
      { aromas: ['Berry', 'Citrus'], description: 'Fruit beer hop balance', style: 'Fruit Beer', type: 'low', category: 'Specialty' },
      { aromas: ['Resin/Pine', 'Herbal'], description: 'Barrel-aged beer harmony', style: 'Barrel-Aged', type: 'low', category: 'Specialty' },
      { aromas: ['Tropical Fruit', 'Citrus'], description: 'Summer seasonal brightness', style: 'Summer Ale', type: 'high', category: 'Specialty' },
    ];
  };

//   const getAromaCombinationSuggestions = () => {
//     const allSelectedAromas = getAllSelectedAromas();
//     if (allSelectedAromas.length === 0) return [];
    
//     const allCombinations = getAllAromaCombinations();
    
//     return allCombinations.filter(combo => {
//       if (combo.type === 'mixed') {
//         return combo.aromasHigh.some(aroma => allSelectedAromas.includes(aroma)) ||
//                combo.aromasLow.some(aroma => allSelectedAromas.includes(aroma));
//       }
//       return combo.aromas.some(aroma => allSelectedAromas.includes(aroma));
//     }).slice(0, 6); // Limit to 6 most relevant suggestions
//   };

  const getPopularPresets = () => {
    const allCombinations = getAllAromaCombinations();
    return [
      allCombinations.find(c => c.style === 'American IPA'),
      allCombinations.find(c => c.style === 'NEIPA'),
      allCombinations.find(c => c.style === 'West Coast IPA'),
      allCombinations.find(c => c.style === 'Pilsner/Lager'),
      allCombinations.find(c => c.style === 'Belgian Ales'),
      allCombinations.find(c => c.style === 'English Bitter'),
    ].filter(Boolean);
  };

  // Helper function to apply a preset combination
  const applyPreset = (preset) => {
    const newAromaStates = {};
    if (preset.type === 'mixed') {
      preset.aromasHigh?.forEach(aroma => {
        newAromaStates[aroma] = 'high';
      });
      preset.aromasLow?.forEach(aroma => {
        newAromaStates[aroma] = 'low';
      });
    } else {
      preset.aromas.forEach(aroma => {
        newAromaStates[aroma] = preset.type === 'low' ? 'low' : 'high';
      });
    }
    setAromaStates(newAromaStates);
  };

  const getHopInfo = (hopUniqueId) => {
    return uniqueHops.find(hop => hop.uniqueId === hopUniqueId);
  };

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

  // Generate brewing tip based on hop characteristics
  const getBrewingTip = (hopInfo) => {
    const tips = [];
    
    if (hopInfo.avgAlpha > 15) {
      tips.push('High alpha - excellent for bittering additions');
    } else if (hopInfo.avgAlpha < 5) {
      tips.push('Low alpha - ideal for aroma and late additions');
    }
    
    if (hopInfo.avgOil > 2.5) {
      tips.push('high oil content provides intense aroma');
    }
    
    if (hopInfo.cohumuloneClass.label.includes('Low')) {
      tips.push('smooth, refined bitterness character');
    } else if (hopInfo.cohumuloneClass.label.includes('High')) {
      tips.push('punchy bitterness - use carefully');
    }
    
    if (hopInfo.betaAlphaClass.label.includes('Stable')) {
      tips.push('excellent storage stability');
    }
    
    const purposeMap = {
      'Bittering': 'Add early in boil (60-90 min) for clean bitterness',
      'Aroma': 'Add late in boil (&lt;15 min), whirlpool, or dry hop',
      'Dual-Purpose': 'Versatile - great for any stage of brewing'
    };
    
    if (purposeMap[hopInfo.purpose.label]) {
      tips.push(purposeMap[hopInfo.purpose.label]);
    }
    
    return tips.join('; ') || 'Excellent brewing characteristics.';
  };

  // Helper to get border color for cards
  const getBorderColor = (color) => {
    const colorMap = {
      'orange': '#fd7e14',
      'green': '#51cf66',
      'blue': '#339af0',
      'violet': '#845ec2'
    };
    return colorMap[color] || '#ced4da';
  };

  return (
    <Paper shadow="sm" p="lg">
      {/* Search and Filter Section */}
      <Box mb="md">
        <Group justify="space-between" mb="md">
          <Text size="lg" fw={600}>Hop Selection & Filtering</Text>
          <Button
            variant="subtle"
            size="sm"
            leftSection={filtersExpanded ? <IconChevronUp size="1rem" /> : <IconChevronDown size="1rem" />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            {filtersExpanded ? 'Hide' : 'Show'} Filters
          </Button>
        </Group>

        <Collapse in={filtersExpanded}>
          <Stack gap="md" mb="md">
            {/* Quick Style Presets */}
            <Box>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <IconBeer size="0.8rem" />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>Quick Style Presets:</Text>
                </Group>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconBook size="0.8rem" />}
                  onClick={() => setPresetsModalOpen(true)}
                >
                  Browse All ({getAllAromaCombinations().length})
                </Button>
              </Group>
              
              <Flex gap="xs" wrap="wrap">
                {getPopularPresets().map((preset, index) => (
                  <Button
                    key={index}
                    size="xs"
                    variant="light"
                    color="blue"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.style}
                  </Button>
                ))}
              </Flex>
            </Box>
            {/* Aroma Categories Filter */}
            <Box>
              <Group gap="xs" mb="xs">
                <Text size="sm" fw={500}>
                  Filter by Aroma Categories:
                </Text>
                <Tooltip 
                  label="Green filters show hops with the aroma in top 3, while Red filters show hops with the aroma in bottom 3 (including 0 intensity). Green sorting takes precedence over red. Click chips to cycle through: Unselected → Green (sort by highest intensity) → Red (sort by lowest intensity) → Unselected"
                  multiline
                  w={300}
                  withArrow
                >
                  <IconHelp size="1rem" style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }} />
                </Tooltip>
              </Group>
              
              <Group gap="xs">
                {availableAromaCategories.map((aroma) => {
                  const currentState = aromaStates[aroma] || 'none';
                  
                  return (
                    <Button
                      key={aroma}
                      size="sm"
                      variant={currentState === 'none' ? 'light' : 'filled'}
                      color={currentState === 'high' ? 'green' : currentState === 'low' ? 'red' : 'gray'}
                      onClick={() => handleAromaClick(aroma)}
                      style={{
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: currentState === 'high' ? 'var(--mantine-color-green-5)' : 
                                   currentState === 'low' ? 'var(--mantine-color-red-5)' : 
                                   'var(--mantine-color-gray-4)'
                      }}
                    >
                      {aroma}
                      {currentState === 'high' && ' ↑'}
                      {currentState === 'low' && ' ↓'}
                    </Button>
                  );
                })}
              </Group>
            </Box>

            {/* Brewing Parameters Filter */}
            <Box>
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" variant="light" color="orange">
                  <IconFlask size="0.8rem" />
                </ThemeIcon>
                <Text size="sm" fw={500}>
                  Filter by Brewing Parameters:
                </Text>
                <Tooltip 
                  label="Click chips to cycle through preset ranges based on brewing science thresholds. Each click advances to the next category, then back to 'off'."
                  multiline
                  w={300}
                  withArrow
                >
                  <IconHelp size="1rem" style={{ cursor: 'help', color: 'var(--mantine-color-dimmed)' }} />
                </Tooltip>
              </Group>
              
              <Group gap="xs" mb="md" wrap="wrap">
                {/* Alpha Acids Chip */}
                <Button
                  size="sm"
                  variant={alphaThreshold ? 'filled' : 'light'}
                  color={getAlphaChipInfo().color}
                  onClick={cycleAlphaThreshold}
                  style={{
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: alphaThreshold ? `var(--mantine-color-${getAlphaChipInfo().color}-5)` : 'var(--mantine-color-gray-4)'
                  }}
                >
                  {getAlphaChipInfo().label}
                  {alphaThreshold && ' ✓'}
                </Button>

                {/* Cohumulone Chip */}
                <Button
                  size="sm"
                  variant={cohumuloneThreshold ? 'filled' : 'light'}
                  color={getCohumuloneChipInfo().color}
                  onClick={cycleCohumuloneThreshold}
                  style={{
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: cohumuloneThreshold ? `var(--mantine-color-${getCohumuloneChipInfo().color}-5)` : 'var(--mantine-color-gray-4)'
                  }}
                >
                  {getCohumuloneChipInfo().label}
                  {cohumuloneThreshold && ' ✓'}
                </Button>

                {/* Oil Content Chip */}
                <Button
                  size="sm"
                  variant={oilThreshold ? 'filled' : 'light'}
                  color={getOilChipInfo().color}
                  onClick={cycleOilThreshold}
                  style={{
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: oilThreshold ? `var(--mantine-color-${getOilChipInfo().color}-5)` : 'var(--mantine-color-gray-4)'
                  }}
                >
                  {getOilChipInfo().label}
                  {oilThreshold && ' ✓'}
                </Button>

                {/* Custom Ranges Chip - Always visible */}
                <Button
                  size="sm"
                  variant={showCustomRanges ? 'filled' : 'light'}
                  color="indigo"
                  onClick={() => setShowCustomRanges(!showCustomRanges)}
                  style={{
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: showCustomRanges ? 'var(--mantine-color-indigo-5)' : 'var(--mantine-color-gray-4)'
                  }}
                >
                  Custom Ranges
                  {showCustomRanges && ' ✓'}
                </Button>
              </Group>

              {/* Custom Range Sliders (shown only when Custom Ranges chip is active) */}
              {showCustomRanges && (
                <Stack gap="md" mt="md">
                  <Text size="xs" c="dimmed" fw={500}>Custom range adjustments:</Text>
                  
                  {/* Alpha Acids Range */}
                  <Box>
                    <Text size="xs" fw={500} mb="sm">
                      Alpha Acids: {alphaRange[0]}% - {alphaRange[1]}%
                      {alphaThreshold && (
                        <Text component="span" c="dimmed" size="xs"> (preset: {getAlphaChipInfo().label})</Text>
                      )}
                    </Text>
                    <Box mb="lg">
                      <RangeSlider
                        size="sm"
                        min={0}
                        max={25}
                        step={0.5}
                        value={alphaRange}
                        onChange={(value) => {
                          setAlphaRange(value);
                          setAlphaThreshold(''); // Clear threshold when manually adjusting
                          setUseAlphaFilter(true); // Enable filter when adjusting
                        }}
                        marks={[
                          { value: ALPHA_THRESHOLDS.VERY_LOW, label: `${ALPHA_THRESHOLDS.VERY_LOW}%` },
                          { value: ALPHA_THRESHOLDS.MEDIUM, label: `${ALPHA_THRESHOLDS.MEDIUM}%` },
                          { value: ALPHA_THRESHOLDS.HIGH, label: `${ALPHA_THRESHOLDS.HIGH}%` },
                          { value: ALPHA_THRESHOLDS.SUPER_ALPHA, label: `${ALPHA_THRESHOLDS.SUPER_ALPHA}%` }
                        ]}
                      />
                    </Box>
                  </Box>

                  {/* Cohumulone Range */}
                  <Box>
                    <Text size="xs" fw={500} mb="sm">
                      Cohumulone: {cohumuloneRange[0]}% - {cohumuloneRange[1]}%
                      {cohumuloneThreshold && (
                        <Text component="span" c="dimmed" size="xs"> (preset: {getCohumuloneChipInfo().label})</Text>
                      )}
                    </Text>
                    <Box mb="lg">
                      <RangeSlider
                        size="sm"
                        min={0}
                        max={50}
                        step={1}
                        value={cohumuloneRange}
                        onChange={(value) => {
                          setCohumuloneRange(value);
                          setCohumuloneThreshold(''); // Clear threshold when manually adjusting
                          setUseCohumuloneFilter(true); // Enable filter when adjusting
                        }}
                        marks={[
                          { value: COHUMULONE_THRESHOLDS.LOW, label: `${COHUMULONE_THRESHOLDS.LOW}%` },
                          { value: COHUMULONE_THRESHOLDS.HIGH, label: `${COHUMULONE_THRESHOLDS.HIGH}%` }
                        ]}
                      />
                    </Box>
                  </Box>

                  {/* Oil Content Range */}
                  <Box>
                    <Text size="xs" fw={500} mb="sm">
                      Oil Content: {oilRange[0]} - {oilRange[1]} ml/100g
                      {oilThreshold && (
                        <Text component="span" c="dimmed" size="xs"> (preset: {getOilChipInfo().label})</Text>
                      )}
                    </Text>
                    <Box mb="lg">
                      <RangeSlider
                        size="sm"
                        min={0}
                        max={4}
                        step={0.1}
                        value={oilRange}
                        onChange={(value) => {
                          setOilRange(value);
                          setOilThreshold(''); // Clear threshold when manually adjusting
                          setUseOilFilter(true); // Enable filter when adjusting
                        }}
                        marks={[
                          { value: OIL_THRESHOLDS.LOW, label: `${OIL_THRESHOLDS.LOW}` },
                          { value: OIL_THRESHOLDS.MEDIUM, label: `${OIL_THRESHOLDS.MEDIUM}` },
                          { value: OIL_THRESHOLDS.HIGH, label: `${OIL_THRESHOLDS.HIGH}` },
                          { value: OIL_THRESHOLDS.VERY_HIGH, label: `${OIL_THRESHOLDS.VERY_HIGH}` }
                        ]}
                      />
                    </Box>
                  </Box>
                </Stack>
              )}
            </Box>

            {/* Clear All Filters Button */}
            {(getAllSelectedAromas().length > 0 || useAlphaFilter || useCohumuloneFilter || useOilFilter || showCustomRanges) && (
              <Group justify="center" mt="md">
                <Button
                  variant="light"
                  color="red"
                  size="sm"
                  leftSection={<IconX size="0.8rem" />}
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              </Group>
            )}

            {/* Filter Results Summary */}
            <Box p="sm" style={{ borderRadius: 6 }} bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
              <Text size="sm" fw={500}>
                Showing {availableHops.length} of {uniqueHops.length} hops
                {(getAllSelectedAromas().length > 0 || useAlphaFilter || useCohumuloneFilter || useOilFilter) && (
                  <Text component="span" c="dimmed" size="sm">
                    {' '}• filtered by: 
                    {getAllSelectedAromas().length > 0 && (
                      <>
                        {getSelectedAromasHigh().length > 0 && (
                          <Text component="span" c="green" size="sm">
                            {' '}HIGH: {getSelectedAromasHigh().join(', ')} (in top 3)
                          </Text>
                        )}
                        {getSelectedAromasLow().length > 0 && (
                          <Text component="span" c="red" size="sm">
                            {getSelectedAromasHigh().length > 0 ? ' | ' : ' '}LOW: {getSelectedAromasLow().join(', ')} (in bottom 3, including 0)
                          </Text>
                        )}
                      </>
                    )}
                    {(useAlphaFilter || useCohumuloneFilter || useOilFilter) && (
                      <Text component="span" c="orange" size="sm">
                        {getAllSelectedAromas().length > 0 ? ' | ' : ' '}
                        {useAlphaFilter && `Alpha: ${alphaRange[0]}-${alphaRange[1]}%`}
                        {useCohumuloneFilter && (useAlphaFilter ? ', ' : '') + `Cohumulone: ${cohumuloneRange[0]}-${cohumuloneRange[1]}%`}
                        {useOilFilter && ((useAlphaFilter || useCohumuloneFilter) ? ', ' : '') + `Oil: ${oilRange[0]}-${oilRange[1]} ml/100g`}
                      </Text>
                    )}
                  </Text>
                )}
              </Text>
            </Box>
          </Stack>
        </Collapse>

        {/* Hop Selection MultiSelect */}
        <MultiSelect
          placeholder="Search and choose hops..."
          value={selectedHops}
          searchable
          clearable
          maxValues={5}
          data={availableHops.map((hop) => ({
            value: hop.uniqueId,
            label: hop.name
          }))}
          onChange={onHopSelection}
          mb="md"
        />
      </Box>

      {selectedHops.length > 0 && (
        <Stack gap="md">
          <Divider label="Selected Hops" labelPosition="center" />
          {selectedHops.map((hopName) => {
            const hopInfo = getHopInfo(hopName);
            if (!hopInfo) return null;

            const IconComponent = hopInfo.purpose.icon;

            return (
              <Card key={hopName} withBorder p="md" style={{ borderLeft: `4px solid ${getBorderColor(hopInfo.purpose.color)}` }}>
                {/* Header Section */}
                <Group justify="space-between" mb="sm">
                  <Group>
                    <ThemeIcon color={hopInfo.purpose.color} variant="light" size="lg">
                      <IconComponent size="1.2rem" />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="lg" c="blue">
                        {hopInfo.displayName}
                      </Text>
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          {hopInfo.country} • {hopInfo.source}
                        </Text>
                        <Tooltip label={hopInfo.purpose.description} withArrow>
                          <Badge color={hopInfo.purpose.color} variant="light" size="sm">
                            {hopInfo.purpose.label}
                          </Badge>
                        </Tooltip>
                      </Group>
                    </div>
                  </Group>
                </Group>

                {/* Chemistry Analysis */}
                <Grid mb="md">
                  <Grid.Col span={6}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="orange">
                          <IconFlask size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>Alpha Acids:</Text>
                        <Text size="sm">{formatRange(hopInfo.alpha_from, hopInfo.alpha_to)}</Text>
                      </Group>
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="blue">
                          <IconChartBar size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>Beta Acids:</Text>
                        <Text size="sm">{formatRange(hopInfo.beta_from, hopInfo.beta_to)}</Text>
                      </Group>
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="teal">
                          <IconDroplet size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>Total Oil:</Text>
                        <Text size="sm">{formatRange(hopInfo.oil_from, hopInfo.oil_to, ' ml/100g', true)}</Text>
                      </Group>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap="xs">
                      {hopInfo.avgCohumulone > 0 && (
                        <Group gap="xs">
                          <ThemeIcon size="sm" variant="light" color="yellow">
                            <IconShieldCheck size="0.8rem" />
                          </ThemeIcon>
                          <Text size="sm" fw={500}>Cohumulone:</Text>
                          <Text size="sm">{formatRange(hopInfo.co_h_from, hopInfo.co_h_to)}</Text>
                          <Tooltip label={hopInfo.cohumuloneClass.description} withArrow>
                            <Badge size="xs" color={hopInfo.cohumuloneClass.color} variant="light">
                              {hopInfo.cohumuloneClass.label}
                            </Badge>
                          </Tooltip>
                        </Group>
                      )}
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="gray">
                          <IconScale size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>β/α Ratio:</Text>
                        <Text size="sm">{hopInfo.betaAlphaRatio.toFixed(2)}</Text>
                        <Tooltip label={hopInfo.betaAlphaClass.description} withArrow>
                          <Badge size="xs" color={hopInfo.betaAlphaClass.color} variant="light">
                            {hopInfo.betaAlphaClass.label}
                          </Badge>
                        </Tooltip>
                      </Group>
                    </Stack>
                  </Grid.Col>
                </Grid>

                {/* Aroma Profile & Flavor Notes */}
                <Box mb="md">
                  {/* Standardized Aroma Categories - DISABLED */}
                  {/* {hopInfo.aromas && Object.entries(hopInfo.aromas).some(([_, intensity]) => intensity > 0) && (
                    <Box mb="sm">
                      <Group gap="xs" mb="xs">
                        <ThemeIcon size="sm" variant="light" color="purple">
                          <IconDroplet size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>Aroma Profile (Top 3):</Text>
                      </Group>
                      <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {getTopAromas(hopInfo, 3).map(({ category, intensity }, index) => (
                          <Badge 
                            key={category} 
                            variant="filled"
                            size="sm"
                            color={index === 0 ? 'purple' : index === 1 ? 'violet' : 'indigo'}
                          >
                            #{index + 1} {category} ({intensity}/5)
                          </Badge>
                        ))}
                      </Box>
                      {/* Show additional aromas if any */}
                      {/*Object.entries(hopInfo.aromas).filter(([_, intensity]) => intensity > 0).length > 3 && (
                        <Box mt="xs">
                          <Text size="xs" c="dimmed">
                            Other aromas: {Object.entries(hopInfo.aromas)
                              .filter(([_, intensity]) => intensity > 0)
                              .sort(([_, a], [__, b]) => b - a)
                              .slice(3)
                              .map(([category, intensity]) => `${category} (${intensity})`)
                              .join(', ')}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  )} */}

                  {/* Text-based Flavor Notes */}
                  {hopInfo.notes && hopInfo.notes.length > 0 && (
                    <Box>
                      <Group gap="xs" mb="xs">
                        <ThemeIcon size="sm" variant="light" color="green">
                          <IconLeaf size="0.8rem" />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>Flavor Notes:</Text>
                      </Group>
                      <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {hopInfo.notes.map((note, i) => (
                          <Badge 
                            key={i} 
                            variant="outline"
                            size="sm"
                            color="green"
                          >
                            {note}
                          </Badge>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Brewing Recommendations */}
                <Box mt="md" p="sm" style={{ borderRadius: 6 }} bg={colorScheme === 'dark' ? 'dark.5' : 'gray.1'}>
                  <Text size="xs" fw={500} mb="xs">Quick Brewing Tips:</Text>
                  <Text size="xs" c="dimmed">
                    {getBrewingTip(hopInfo)}
                  </Text>
                </Box>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Browse All Combinations Modal */}
      <Modal
        opened={presetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
        title="Browse All Brewing Style Combinations"
        size="xl"
        scrollAreaComponent={Modal.NativeScrollArea}
      >
        <Tabs defaultValue="IPA">
          <Tabs.List>
            <Tabs.Tab value="IPA">IPA Styles</Tabs.Tab>
            <Tabs.Tab value="European">European</Tabs.Tab>
            <Tabs.Tab value="Belgian">Belgian</Tabs.Tab>
            <Tabs.Tab value="English">English</Tabs.Tab>
            <Tabs.Tab value="German">German</Tabs.Tab>
            <Tabs.Tab value="American">American</Tabs.Tab>
            <Tabs.Tab value="Specialty">Specialty</Tabs.Tab>
          </Tabs.List>

          {['IPA', 'European', 'Belgian', 'English', 'German', 'American', 'Specialty'].map(category => (
            <Tabs.Panel key={category} value={category} pt="md">
              <Grid>
                {getAllAromaCombinations()
                  .filter(combo => combo.category === category)
                  .map((combo, index) => (
                    <Grid.Col key={index} span={6}>
                      <Card withBorder p="md" h="100%">
                        <Stack gap="sm" h="100%" justify="space-between">
                          <Box>
                            <Group justify="space-between" mb="xs">
                              <Badge variant="filled" color="grape">
                                {combo.style}
                              </Badge>
                              <Group gap={4}>
                                {combo.type === 'low' && (
                                  <Badge size="xs" variant="outline" color="orange">
                                    Subtle
                                  </Badge>
                                )}
                                {combo.type === 'mixed' && (
                                  <Badge size="xs" variant="outline" color="violet">
                                    Mixed Profile
                                  </Badge>
                                )}
                              </Group>
                            </Group>
                            
                            <Group gap={4} mb="xs" wrap="wrap">
                              {combo.type === 'mixed' ? (
                                <>
                                  {combo.aromasHigh.map((aroma) => (
                                    <Badge key={aroma} size="sm" variant="light" color="green">
                                      {aroma} ↑
                                    </Badge>
                                  ))}
                                  {combo.aromasLow.map((aroma) => (
                                    <Badge key={aroma} size="sm" variant="light" color="red">
                                      {aroma} ↓
                                    </Badge>
                                  ))}
                                </>
                              ) : (
                                combo.aromas.map((aroma) => (
                                  <Badge key={aroma} size="sm" variant="light" color={combo.type === 'low' ? 'orange' : 'blue'}>
                                    {aroma}
                                  </Badge>
                                ))
                              )}
                            </Group>
                            
                            <Text size="sm" c="dimmed">
                              {combo.description}
                            </Text>
                          </Box>
                          
                          <Button
                            size="sm"
                            variant="light"
                            fullWidth
                            onClick={() => {
                              applyPreset(combo);
                              setPresetsModalOpen(false);
                            }}
                          >
                            Apply
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
              </Grid>
            </Tabs.Panel>
          ))}
        </Tabs>
      </Modal>
    </Paper>
  );
};

export default HopSelector;
