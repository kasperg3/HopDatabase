import React, { createContext, useContext, useReducer } from 'react';

// Centralized state management for hop filtering
const HopFilterContext = createContext();

const initialState = {
  selectedHops: [],
  aromaFilters: {}, // { aromaName: 'none' | 'high' | 'low' }
  parameterFilters: {
    alpha: [0, 25],
    cohumulone: [0, 50],
    oil: [0, 4],
  },
  useParameterFilters: {
    useAlphaFilter: false,
    useCohumuloneFilter: false,
    useOilFilter: false,
  },
  thresholds: {
    alphaThreshold: '',
    cohumuloneThreshold: '',
    oilThreshold: '',
  },
  showCustomRanges: false,
};

function hopFilterReducer(state, action) {
  switch (action.type) {
    case 'SET_SELECTED_HOPS':
      return { ...state, selectedHops: action.payload };
    case 'UPDATE_AROMA_FILTER':
      return { 
        ...state, 
        aromaFilters: { ...state.aromaFilters, [action.aroma]: action.value }
      };
    case 'SET_PARAMETER_FILTER':
      return {
        ...state,
        parameterFilters: { ...state.parameterFilters, [action.parameter]: action.value }
      };
    case 'SET_USE_PARAMETER_FILTER':
      return {
        ...state,
        useParameterFilters: { ...state.useParameterFilters, [action.parameter]: action.value }
      };
    case 'SET_THRESHOLD':
      return {
        ...state,
        thresholds: { ...state.thresholds, [action.threshold]: action.value }
      };
    case 'SET_SHOW_CUSTOM_RANGES':
      return { ...state, showCustomRanges: action.value };
    case 'CLEAR_ALL_FILTERS':
      return { 
        ...initialState, 
        selectedHops: state.selectedHops 
      };
    default:
      return state;
  }
}

export const HopFilterProvider = ({ children }) => {
  const [state, dispatch] = useReducer(hopFilterReducer, initialState);
  
  return (
    <HopFilterContext.Provider value={{ state, dispatch }}>
      {children}
    </HopFilterContext.Provider>
  );
};

export const useHopFilter = () => {
  const context = useContext(HopFilterContext);
  if (!context) {
    throw new Error('useHopFilter must be used within HopFilterProvider');
  }
  return context;
};
