// Vessel presets with internal dimensions
export const VESSEL_PRESETS = [
  { id: 'corny',   label: 'Corny Keg (19L)',  volume: 19, diameter: 21.6 },
  { id: 'sanke25', label: 'Sanke Keg (25L)',  volume: 25, diameter: 36.3 },
  { id: 'sanke50', label: 'Sanke Keg (50L)',  volume: 50, diameter: 36.3 },
];

// Common beer style CO2 volumes for quick presets
export const CO2_STYLE_PRESETS = [
  { label: 'British Ale',    vol: 1.5 },
  { label: 'Porter/Stout',   vol: 1.8 },
  { label: 'American Ale',   vol: 2.2 },
  { label: 'Lager',          vol: 2.5 },
  { label: 'Wheat Beer',     vol: 3.0 },
  { label: 'Belgian',        vol: 3.5 },
  { label: 'High Carb',      vol: 4.0 },
];

// Default constants
export const V_INITIAL = 0.85;   // CO2 volumes remaining after fermentation
export const K_STATIC = 0.004;   // Absorption constant for static carbonation (cm^-2 * L * hr^-1)
export const K_SHAKE = 0.2;      // Absorption constant for shaking method (min^-1)

/**
 * Atmospheric pressure at a given altitude.
 * @param {number} H - Altitude in meters
 * @returns {number} Atmospheric pressure in bar
 */
export function atmosphericPressure(H) {
  return 1.013 * Math.exp(-H / 10197);
}

/**
 * Cross-sectional surface area of the liquid in the vessel.
 * @param {number} d - Internal diameter in cm
 * @returns {number} Surface area in cm^2
 */
export function surfaceArea(d) {
  return Math.PI * (d / 2) ** 2;
}

/**
 * Ratio of gas-liquid contact surface to liquid volume.
 * @param {number} SA - Surface area in cm^2
 * @param {number} L - Liquid volume in liters
 * @returns {number} Absorption ratio (cm^2 / L)
 */
export function absorptionRatio(SA, L) {
  return SA / L;
}

/**
 * Equilibrium CO2 volumes at a given absolute pressure and temperature.
 * Vail/Glass equation: V = P_abs * exp(-(2617.25 / T_K) + 10.7527)
 * @param {number} P_abs - Absolute pressure in bar
 * @param {number} T - Temperature in Celsius
 * @returns {number} CO2 volumes
 */
export function equilibriumVolumes(P_abs, T) {
  const T_K = T + 273.15;
  return P_abs * Math.exp(-(2617.25 / T_K) + 10.7527);
}

/**
 * Gauge pressure required to achieve target CO2 volumes at a given temperature.
 * Inverse of the Vail/Glass equation.
 * @param {number} V - Target CO2 volumes
 * @param {number} T - Temperature in Celsius
 * @param {number} P_atm - Atmospheric pressure in bar (default 1.013)
 * @returns {number} Gauge pressure in bar
 */
export function equilibriumPressure(V, T, P_atm = 1.013) {
  const T_K = T + 273.15;
  const exponent = -(2617.25 / T_K) + 10.7527;
  const P_abs = V / Math.exp(exponent);
  return P_abs - P_atm;
}

/**
 * CO2 volumes dissolved after time t at a given applied gauge pressure.
 * Exponential absorption model.
 * @param {number} V_eq - Equilibrium CO2 volumes at applied pressure
 * @param {number} V_initial - Initial CO2 volumes in the beer
 * @param {number} k - Absorption constant
 * @param {number} R - Absorption ratio (SA / volume)
 * @param {number} t - Time in hours
 * @returns {number} CO2 volumes at time t
 */
export function volumesAtTime(V_eq, V_initial, k, R, t) {
  const decay = Math.exp(-k * R * t);
  return V_eq * (1 - decay) + V_initial * decay;
}

/**
 * Time required to reach target CO2 volumes at a given gauge pressure.
 * @param {number} V_target - Target CO2 volumes
 * @param {number} V_eq - Equilibrium CO2 volumes at applied pressure
 * @param {number} V_initial - Initial CO2 volumes
 * @param {number} k - Absorption constant
 * @param {number} R - Absorption ratio
 * @returns {number} Time in hours, or Infinity if unreachable
 */
export function timeForTarget(V_target, V_eq, V_initial, k, R) {
  if (V_eq <= V_initial || V_target >= V_eq) return Infinity;
  const ratio = (V_target - V_eq) / (V_initial - V_eq);
  if (ratio <= 0) return Infinity;
  return -Math.log(ratio) / (k * R);
}

/**
 * Required gauge pressure to reach target CO2 volumes in a given time.
 * Inverts the exponential absorption model to find V_eq, then converts to pressure.
 * @param {number} V_target - Target CO2 volumes
 * @param {number} V_initial - Initial CO2 volumes
 * @param {number} k - Absorption constant
 * @param {number} R - Absorption ratio
 * @param {number} t - Time in hours
 * @param {number} T - Temperature in Celsius
 * @param {number} P_atm - Atmospheric pressure in bar
 * @returns {number} Required gauge pressure in bar
 */
export function pressureForTarget(V_target, V_initial, k, R, t, T, P_atm = 1.013) {
  const decay = Math.exp(-k * R * t);
  if (decay >= 1) return Infinity;
  const V_eq_needed = (V_target - V_initial * decay) / (1 - decay);
  if (V_eq_needed <= 0) return 0;
  return equilibriumPressure(V_eq_needed, T, P_atm);
}

/**
 * Time to reach target carbonation using the shaking/rolling method.
 * @param {number} V_target - Target CO2 volumes
 * @param {number} V_eq - Equilibrium CO2 volumes at applied pressure
 * @param {number} V_initial - Initial CO2 volumes
 * @param {number} k_shake - Shaking absorption constant (min^-1)
 * @returns {number} Time in minutes, or Infinity if unreachable
 */
export function shakingTime(V_target, V_eq, V_initial, k_shake = K_SHAKE) {
  if (V_eq <= V_initial || V_target >= V_eq) return Infinity;
  const ratio = (V_target - V_eq) / (V_initial - V_eq);
  if (ratio <= 0) return Infinity;
  return -Math.log(ratio) / k_shake;
}
