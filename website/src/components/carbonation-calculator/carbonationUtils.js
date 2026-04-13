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

// Metric polynomial coefficients for CO2 equilibrium pressure.
//
// Derived from the well-known ASBC / Zahm & Nagel polynomial for beer
// carbonation (originally in °F and psi):
//
//   P_psi = -16.6999 - 0.0101059*Tf + 0.00116512*Tf^2
//         + 0.173354*Tf*V + 4.24267*V - 0.0684226*V^2
//
// Substituting Tf = 1.8*T + 32 and converting psi -> bar (x 0.0689476)
// gives the metric polynomial below. Accurate to ~0.02 bar vs. standard
// brewing carbonation charts in the 0-20 C, 1-5 vol range.
const C0 =  -1.09140;    // constant
const C1 =   0.007998;   // T
const C2 =   0.0002603;  // T^2
const C3 =   0.021513;   // T * V
const C4 =   0.67497;    // V
const C5 =  -0.004717;   // V^2

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
 * Gauge pressure required to reach target CO2 volumes at a given temperature
 * (assuming sea-level atmospheric pressure of 1.013 bar).
 * @param {number} V - Target CO2 volumes
 * @param {number} T - Temperature in Celsius
 * @returns {number} Gauge pressure in bar (at sea level)
 */
export function equilibriumPressureSeaLevel(V, T) {
  return C0 + C1 * T + C2 * T * T + C3 * T * V + C4 * V + C5 * V * V;
}

/**
 * Gauge pressure required to reach target CO2 volumes at a given temperature,
 * corrected for local atmospheric pressure (altitude).
 *
 * The underlying solubility only depends on absolute pressure, so:
 *   P_gauge_local = P_abs - P_atm_local
 *                 = (P_gauge_sealevel + 1.013) - P_atm_local
 * @param {number} V - Target CO2 volumes
 * @param {number} T - Temperature in Celsius
 * @param {number} P_atm - Local atmospheric pressure in bar (default 1.013)
 * @returns {number} Gauge pressure in bar
 */
export function equilibriumPressure(V, T, P_atm = 1.013) {
  return equilibriumPressureSeaLevel(V, T) + (1.013 - P_atm);
}

/**
 * CO2 volumes dissolved in beer at equilibrium for a given absolute pressure
 * and temperature. Inverts the metric polynomial by solving a quadratic in V.
 *
 * Operates on absolute pressure, so altitude is handled by the caller
 * (P_abs = P_gauge_local + P_atm_local).
 * @param {number} P_abs - Absolute pressure in bar
 * @param {number} T - Temperature in Celsius
 * @returns {number} CO2 volumes at equilibrium (clamped to >= 0)
 */
export function equilibriumVolumes(P_abs, T) {
  // Convert absolute pressure to sea-level gauge pressure, since the
  // polynomial is fitted in terms of sea-level gauge pressure.
  const P_gauge_sea = P_abs - 1.013;

  // Quadratic in V: C5*V^2 + (C3*T + C4)*V + (C0 + C1*T + C2*T^2 - P_gauge_sea) = 0
  const a = C5;
  const b = C3 * T + C4;
  const c = C0 + C1 * T + C2 * T * T - P_gauge_sea;

  const disc = b * b - 4 * a * c;
  if (disc < 0) return 0;

  // a < 0: parabola opens downward. The physically meaningful root is the
  // smaller positive one, obtained with the "+sqrt" branch (since dividing
  // by 2a with a < 0 flips the sign).
  const V = (-b + Math.sqrt(disc)) / (2 * a);
  return Math.max(0, V);
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
 * Inverts the exponential absorption model to find V_eq, then converts to
 * pressure via equilibriumPressure.
 * @param {number} V_target - Target CO2 volumes
 * @param {number} V_initial - Initial CO2 volumes
 * @param {number} k - Absorption constant
 * @param {number} R - Absorption ratio
 * @param {number} t - Time in hours
 * @param {number} T - Temperature in Celsius
 * @param {number} P_atm - Local atmospheric pressure in bar
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
