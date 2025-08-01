// Shared brewing science constants and thresholds
export const ALPHA_THRESHOLDS = {
  SUPER_ALPHA: 11,
  HIGH: 8,
  MEDIUM: 5,
  LOW: 3,
  VERY_LOW: 3,
};

export const OIL_THRESHOLDS = {
  VERY_HIGH: 2.5,
  HIGH: 1.5,
  MEDIUM: 0.8,
  LOW: 0.4,
};

export const COHUMULONE_THRESHOLDS = {
  HIGH: 34,
  MODERATE: 26,
  LOW: 25,
};

export const BETA_ALPHA_THRESHOLDS = {
  STABLE: 0.8,
  AGING_POTENTIAL: 0.9,
};

// Chart colors for consistent visualization
export const CHART_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#FF8A80', '#82B1FF', '#F8BBD9',
  '#E0C3FC', '#8ED1FC', '#F5A623', '#BD10E0'
];

// Common scaling factors for normalization 
export const NORMALIZATION_SCALES = {
  ALPHA_MAX: 20,
  BETA_MAX: 10,
  OIL_MAX: 4,
  COHUMULONE_MAX: 50,
  BETA_ALPHA_RATIO_MAX: 2,
};
