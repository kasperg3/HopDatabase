// Import shared constants from utils
export { 
  ALPHA_THRESHOLDS,
  OIL_THRESHOLDS,
  COHUMULONE_THRESHOLDS,
  BETA_ALPHA_THRESHOLDS 
} from '../../utils/hopConstants';

// Chip cycling arrays for different filter types
export const ALPHA_CHIP_STATES = ['', 'SUPER_ALPHA', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'];
export const COHUMULONE_CHIP_STATES = ['', 'HIGH', 'STANDARD', 'LOW'];
export const OIL_CHIP_STATES = ['', 'VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'];
