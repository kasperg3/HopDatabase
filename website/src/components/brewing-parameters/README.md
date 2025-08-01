# BrewingParametersComparison Decomposition

## Overview
The `BrewingParametersComparison` component has been decomposed from a 414-line monolithic component into smaller, focused components with shared utilities. This improves maintainability, reusability, and follows the single responsibility principle.

## Component Structure

### Main Component
- **BrewingParametersComparison.js** - Main entry component that orchestrates all sub-components

### Sub-Components
1. **ParametersTable.js** - Renders the detailed brewing parameters table
2. **ParametersRadarChart.js** - Renders the radar chart visualization
3. **ParametersLegend.js** - Renders the explanatory legend at the bottom
4. **useRadarChartData.js** - Custom hook for radar chart data processing

### Shared Utilities (in `/utils/`)
- **hopConstants.js** - Shared constants (alpha thresholds, oil thresholds, etc.)
- **hopUtils.js** - Shared utility functions (parseValue, classification functions, etc.)

## Key Features

### Advanced Hop Analysis
- **Alpha Acid Classification**: Super-Alpha (≥11%), High (8-11%), Medium (5-8%), Low (3-5%), Noble/Very Low (<3%)
- **Oil Content Analysis**: Very High (≥2.5), High (1.5-2.4), Medium (0.8-1.4), Low (<0.8) mL/100g
- **Cohumulone Impact**: High (>34%) yields +15-25% more IBUs, Low (<25%) may yield fewer IBUs
- **Beta/Alpha Ratio**: Storage stability indicator (≥0.8 = Stable, ≥0.9 = Aging potential)
- **Brewing Purpose**: Automatic classification (Super-Alpha, Noble/Aroma, Modern Aroma, Bittering, Dual-Purpose)

### Radar Chart Normalization
- Alpha Acid: Normalized to 20% max → 10 scale
- Beta Acid: Normalized to 10% max → 10 scale  
- Oil Content: Normalized to 4 mL/100g max → 10 scale
- Cohumulone: Normalized to 50% max → 10 scale
- β/α Ratio: Normalized to 2.0 max → 10 scale

### Table Features
- Color-coded hop identification
- Icon-based parameter categories
- Range display with proper formatting
- Conditional display of cohumulone data
- Professional brewing parameter analysis

## Code Organization Benefits

### Before Decomposition
- Single 414-line file with multiple responsibilities
- Duplicated constants and utility functions
- Difficult to maintain and test individual features
- Poor reusability across components

### After Decomposition
- 5 focused components with single responsibilities
- Shared constants and utilities in `/utils/`
- Easy to test and maintain individual features
- Excellent code reusability between HopSelector and BrewingParametersComparison

## Shared Code Generalization

The following code has been generalized and moved to shared utilities:

### From `hopConstants.js`:
- `ALPHA_THRESHOLDS`
- `OIL_THRESHOLDS` 
- `COHUMULONE_THRESHOLDS`
- `BETA_ALPHA_THRESHOLDS`

### From `hopUtils.js`:
- `parseValue()` - Parse numeric values from strings/numbers
- `parseOilValue()` - Specialized oil value parser
- `getAverageValue()` - Calculate average from range
- `formatRange()` - Format display ranges
- `getAlphaClassification()` - Alpha acid classification
- `getOilClassification()` - Oil content classification  
- `getCohumuloneClassification()` - Cohumulone classification
- `getBetaAlphaClassification()` - Beta/Alpha ratio classification
- `getHopPurpose()` - Overall hop purpose classification
- `processHopData()` - Complete hop data processing pipeline

## Usage

```javascript
import BrewingParametersComparison from './components/BrewingParametersComparison';

// Component automatically uses decomposed structure
<BrewingParametersComparison hopData={selectedHops} />
```

## Dependencies
- React & React Hooks
- Mantine UI components
- Recharts for radar visualization
- Tabler Icons for parameter icons
- Shared utilities from `/utils/`

## Performance
- Optimized rendering with focused components
- Shared utilities reduce code duplication
- Custom hooks for data processing
- Responsive design with Mantine Grid system

## Future Enhancements
- Additional brewing parameter calculations
- Export capabilities for brewing calculations
- Integration with brewing software APIs
- Advanced hop substitution recommendations
