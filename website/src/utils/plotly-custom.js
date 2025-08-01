// Custom Plotly build with only polar/spider chart components
import Plotly from 'plotly.js/lib/core';

// Add only the trace types we need
import 'plotly.js/lib/scatterpolar';

// Add only the components we need
import 'plotly.js/lib/polar';

export default Plotly;
