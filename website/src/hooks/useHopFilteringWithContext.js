import { useEffect } from 'react';
import { useHopFilter } from '../contexts/HopFilterContext';
import { useHopFiltering } from '../components/hop-selector/useHopFiltering';

// Bridge hook that connects HopFilterContext with the existing useHopFiltering logic
export const useHopFilteringWithContext = (hopData) => {
  const { state, dispatch } = useHopFilter();
  
  // Use the existing useHopFiltering hook
  const filteringResults = useHopFiltering(hopData);
  
  // Sync context state with the filtering hook when needed
  useEffect(() => {
    // Sync aroma filters from context to the filtering hook
    Object.entries(state.aromaFilters).forEach(([aroma, value]) => {
      if (filteringResults.aromaStates[aroma] !== value) {
        filteringResults.setAromaStates(prev => ({
          ...prev,
          [aroma]: value
        }));
      }
    });
  }, [state.aromaFilters, filteringResults]);

  useEffect(() => {
    // Sync parameter filters from context
    if (state.parameterFilters.alpha !== filteringResults.alphaRange) {
      filteringResults.setAlphaRange(state.parameterFilters.alpha);
    }
    if (state.parameterFilters.cohumulone !== filteringResults.cohumuloneRange) {
      filteringResults.setCohumuloneRange(state.parameterFilters.cohumulone);
    }
    if (state.parameterFilters.oil !== filteringResults.oilRange) {
      filteringResults.setOilRange(state.parameterFilters.oil);
    }
  }, [state.parameterFilters, filteringResults]);

  // Enhanced handleAromaClick that updates both local state and context
  const handleAromaClick = (aroma) => {
    const currentState = state.aromaFilters[aroma] || 'none';
    let newState;
    
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
    
    // Update context
    dispatch({ 
      type: 'UPDATE_AROMA_FILTER', 
      aroma, 
      value: newState 
    });
    
    // Also update the filtering hook state
    filteringResults.handleAromaClick(aroma);
  };

  // Enhanced parameter filter setters that update context
  const setAlphaRange = (range) => {
    dispatch({ 
      type: 'SET_PARAMETER_FILTER', 
      parameter: 'alpha', 
      value: range 
    });
    filteringResults.setAlphaRange(range);
  };

  const setCohumuloneRange = (range) => {
    dispatch({ 
      type: 'SET_PARAMETER_FILTER', 
      parameter: 'cohumulone', 
      value: range 
    });
    filteringResults.setCohumuloneRange(range);
  };

  const setOilRange = (range) => {
    dispatch({ 
      type: 'SET_PARAMETER_FILTER', 
      parameter: 'oil', 
      value: range 
    });
    filteringResults.setOilRange(range);
  };

  // Enhanced clear filters that updates context
  const clearAllFilters = () => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' });
    filteringResults.clearAllFilters();
  };

  // Return enhanced results with context integration
  return {
    ...filteringResults,
    // Override with context-aware functions
    handleAromaClick,
    setAlphaRange,
    setCohumuloneRange,
    setOilRange,
    clearAllFilters,
    // Add context state access
    contextState: state,
    dispatch,
  };
};
