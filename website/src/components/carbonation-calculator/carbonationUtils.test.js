import {
  atmosphericPressure,
  surfaceArea,
  absorptionRatio,
  equilibriumPressure,
  equilibriumPressureSeaLevel,
  equilibriumVolumes,
  volumesAtTime,
  timeForTarget,
  pressureForTarget,
  shakingTime,
  VESSEL_PRESETS,
  V_INITIAL,
  K_STATIC,
  K_SHAKE,
} from './carbonationUtils';

// Helper: convert bar to psi for cross-checking against brewing charts
const barToPsi = (bar) => bar / 0.0689476;

describe('atmosphericPressure', () => {
  test('returns 1.013 bar at sea level', () => {
    expect(atmosphericPressure(0)).toBeCloseTo(1.013, 3);
  });

  test('decreases with altitude', () => {
    expect(atmosphericPressure(1000)).toBeLessThan(1.013);
    expect(atmosphericPressure(1000)).toBeGreaterThan(0.9);
  });

  test('roughly halves near 7000m', () => {
    // barometric formula: P ~ 0.5 bar near the summit of Everest
    expect(atmosphericPressure(7000)).toBeGreaterThan(0.45);
    expect(atmosphericPressure(7000)).toBeLessThan(0.55);
  });
});

describe('surfaceArea', () => {
  test('computes pi * r^2 for a 20cm diameter', () => {
    expect(surfaceArea(20)).toBeCloseTo(Math.PI * 100, 5);
  });

  test('corny keg (d=21.6cm) is ~366 cm^2', () => {
    expect(surfaceArea(21.6)).toBeCloseTo(366.4, 0);
  });

  test('sanke keg (d=36.3cm) is ~1035 cm^2', () => {
    expect(surfaceArea(36.3)).toBeCloseTo(1034.8, 0);
  });
});

describe('absorptionRatio', () => {
  test('returns SA / L', () => {
    expect(absorptionRatio(1000, 20)).toBe(50);
  });
});

describe('equilibriumPressureSeaLevel — rule-of-thumb brewing charts', () => {
  // Cross-checked against the standard ASBC / Brewer's Friend carbonation
  // chart. Tolerance of ~0.15 bar (2 psi) since published charts themselves
  // disagree by 1-2 psi depending on source.

  test('4C, 2.5 vol ~ 0.76 bar (11 psi) — typical ale', () => {
    const p = equilibriumPressureSeaLevel(2.5, 4);
    expect(barToPsi(p)).toBeGreaterThan(10);
    expect(barToPsi(p)).toBeLessThan(13);
  });

  test('4C, 3.0 vol ~ 1.14 bar (16.5 psi) — German wheat', () => {
    const p = equilibriumPressureSeaLevel(3.0, 4);
    expect(barToPsi(p)).toBeGreaterThan(15);
    expect(barToPsi(p)).toBeLessThan(19);
  });

  test('4C, 4.0 vol ~ 1.9 bar (27-28 psi) — Belgian high carb', () => {
    const p = equilibriumPressureSeaLevel(4.0, 4);
    expect(barToPsi(p)).toBeGreaterThan(26);
    expect(barToPsi(p)).toBeLessThan(30);
  });

  test('0C, 2.0 vol — mild carbonation cold storage', () => {
    // At 0C and atmospheric pressure, flat beer holds ~1.6-1.7 vol,
    // so 2.0 vol needs a few psi of positive pressure.
    const p = equilibriumPressureSeaLevel(2.0, 0);
    expect(barToPsi(p)).toBeGreaterThan(1);
    expect(barToPsi(p)).toBeLessThan(6);
  });

  test('10C, 2.5 vol — warmer lagering temperature', () => {
    const p = equilibriumPressureSeaLevel(2.5, 10);
    expect(barToPsi(p)).toBeGreaterThan(15);
    expect(barToPsi(p)).toBeLessThan(19);
  });

  test('15C, 2.5 vol — cellar temperature requires more pressure', () => {
    const p = equilibriumPressureSeaLevel(2.5, 15);
    expect(barToPsi(p)).toBeGreaterThan(18);
    expect(barToPsi(p)).toBeLessThan(24);
  });

  test('pressure increases monotonically with temperature at fixed volumes', () => {
    const p0 = equilibriumPressureSeaLevel(2.5, 0);
    const p10 = equilibriumPressureSeaLevel(2.5, 10);
    const p20 = equilibriumPressureSeaLevel(2.5, 20);
    expect(p10).toBeGreaterThan(p0);
    expect(p20).toBeGreaterThan(p10);
  });

  test('pressure increases monotonically with target volumes at fixed temperature', () => {
    const p2 = equilibriumPressureSeaLevel(2.0, 4);
    const p3 = equilibriumPressureSeaLevel(3.0, 4);
    const p4 = equilibriumPressureSeaLevel(4.0, 4);
    expect(p3).toBeGreaterThan(p2);
    expect(p4).toBeGreaterThan(p3);
  });
});

describe('equilibriumPressure — altitude correction', () => {
  test('at sea level equals the sea-level formula', () => {
    const pSea = equilibriumPressureSeaLevel(2.5, 4);
    const pCorr = equilibriumPressure(2.5, 4, 1.013);
    expect(pCorr).toBeCloseTo(pSea, 5);
  });

  test('at altitude gauge reading must be higher', () => {
    const pSea = equilibriumPressure(2.5, 4, 1.013);
    const pAlt = equilibriumPressure(2.5, 4, 0.8); // ~2000m
    expect(pAlt).toBeGreaterThan(pSea);
    // difference should equal the drop in atmospheric pressure
    expect(pAlt - pSea).toBeCloseTo(1.013 - 0.8, 5);
  });
});

describe('equilibriumVolumes — inverse of the polynomial', () => {
  test('round-trips for 4C, 2.5 vol', () => {
    const P_g = equilibriumPressureSeaLevel(2.5, 4);
    const P_abs = P_g + 1.013;
    expect(equilibriumVolumes(P_abs, 4)).toBeCloseTo(2.5, 2);
  });

  test('round-trips for 10C, 3.0 vol', () => {
    const P_g = equilibriumPressureSeaLevel(3.0, 10);
    const P_abs = P_g + 1.013;
    expect(equilibriumVolumes(P_abs, 10)).toBeCloseTo(3.0, 2);
  });

  test('round-trips for 0C, 1.8 vol', () => {
    const P_g = equilibriumPressureSeaLevel(1.8, 0);
    const P_abs = P_g + 1.013;
    expect(equilibriumVolumes(P_abs, 0)).toBeCloseTo(1.8, 2);
  });

  test('flat beer at 0C, 1 atm absolute ~ 1.6 vol CO2', () => {
    // Physical sanity check: a completely un-carbonated beer at 0C and
    // sea-level atmospheric pressure should hold roughly 1.5-1.8 vol CO2.
    const v = equilibriumVolumes(1.013, 0);
    expect(v).toBeGreaterThan(1.3);
    expect(v).toBeLessThan(1.9);
  });
});

describe('volumesAtTime — exponential absorption model', () => {
  test('returns V_initial at t=0', () => {
    const v = volumesAtTime(3.0, 0.85, K_STATIC, 20, 0);
    expect(v).toBeCloseTo(0.85, 5);
  });

  test('approaches V_eq as t -> infinity', () => {
    const v = volumesAtTime(3.0, 0.85, K_STATIC, 20, 10000);
    expect(v).toBeCloseTo(3.0, 3);
  });

  test('monotonic increase when V_eq > V_initial', () => {
    const v1 = volumesAtTime(3.0, 0.85, K_STATIC, 20, 24);
    const v2 = volumesAtTime(3.0, 0.85, K_STATIC, 20, 48);
    const v3 = volumesAtTime(3.0, 0.85, K_STATIC, 20, 96);
    expect(v2).toBeGreaterThan(v1);
    expect(v3).toBeGreaterThan(v2);
  });
});

describe('timeForTarget and pressureForTarget — round-trip', () => {
  // Corny keg geometry
  const vessel = VESSEL_PRESETS[0];
  const SA = surfaceArea(vessel.diameter);
  const R = absorptionRatio(SA, vessel.volume);

  test('pressure -> time -> pressure is self-consistent', () => {
    const T = 4;
    const P_input = 1.0; // bar gauge
    const P_atm = 1.013;

    const V_eq = equilibriumVolumes(P_input + P_atm, T);
    const V_target = V_INITIAL + 0.5 * (V_eq - V_INITIAL);
    const t = timeForTarget(V_target, V_eq, V_INITIAL, K_STATIC, R);
    expect(Number.isFinite(t)).toBe(true);

    const P_out = pressureForTarget(V_target, V_INITIAL, K_STATIC, R, t, T, P_atm);
    expect(P_out).toBeCloseTo(P_input, 2);
  });

  test('time -> pressure -> time is self-consistent', () => {
    const T = 4;
    const V_target = 2.5;
    const t_input = 48; // hours
    const P_atm = 1.013;

    const P = pressureForTarget(V_target, V_INITIAL, K_STATIC, R, t_input, T, P_atm);
    const V_eq = equilibriumVolumes(P + P_atm, T);
    const t_out = timeForTarget(V_target, V_eq, V_INITIAL, K_STATIC, R);
    expect(t_out).toBeCloseTo(t_input, 1);
  });

  test('higher pressure requires less time to reach target', () => {
    const T = 4;
    const V_target = 2.5;
    const P_atm = 1.013;

    const V_eq_low = equilibriumVolumes(1.0 + P_atm, T);
    const V_eq_high = equilibriumVolumes(2.0 + P_atm, T);

    const t_low = timeForTarget(V_target, V_eq_low, V_INITIAL, K_STATIC, R);
    const t_high = timeForTarget(V_target, V_eq_high, V_INITIAL, K_STATIC, R);
    expect(t_high).toBeLessThan(t_low);
  });

  test('longer time allows lower pressure', () => {
    const T = 4;
    const V_target = 2.5;
    const P_atm = 1.013;

    const p_fast = pressureForTarget(V_target, V_INITIAL, K_STATIC, R, 12, T, P_atm);
    const p_slow = pressureForTarget(V_target, V_INITIAL, K_STATIC, R, 168, T, P_atm);
    expect(p_slow).toBeLessThan(p_fast);
  });

  test('returns Infinity when target is unreachable (V_eq <= V_target)', () => {
    const T = 4;
    // Applied pressure equal to equilibrium pressure: V_eq = V_target exactly,
    // so the exponential never reaches the target.
    const P = equilibriumPressure(2.5, T, 1.013);
    const V_eq = equilibriumVolumes(P + 1.013, T);
    const t = timeForTarget(2.5, V_eq, V_INITIAL, K_STATIC, R);
    expect(t).toBe(Infinity);
  });
});

describe('shakingTime', () => {
  test('produces a finite positive time when V_eq > V_target', () => {
    // At 2 bar gauge, 4C: V_eq is well above any typical target
    const V_eq = equilibriumVolumes(2.0 + 1.013, 4);
    const t = shakingTime(2.5, V_eq, V_INITIAL, K_SHAKE);
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThan(0);
  });

  test('rule of thumb: 2.5 vol at 2 bar, 4C shakes in well under an hour', () => {
    // Published homebrew guides consistently say 3-15 minutes of vigorous
    // rocking at ~30 psi (~2 bar) reaches typical carbonation.
    const V_eq = equilibriumVolumes(2.0 + 1.013, 4);
    const t = shakingTime(2.5, V_eq, V_INITIAL, K_SHAKE);
    expect(t).toBeGreaterThan(2);
    expect(t).toBeLessThan(30);
  });

  test('returns Infinity when target is unreachable', () => {
    const V_eq = equilibriumVolumes(0.3 + 1.013, 4); // very low pressure
    const t = shakingTime(3.5, V_eq, V_INITIAL, K_SHAKE);
    expect(t).toBe(Infinity);
  });
});

describe('VESSEL_PRESETS', () => {
  test('exposes corny + two sanke sizes', () => {
    const ids = VESSEL_PRESETS.map((v) => v.id);
    expect(ids).toEqual(expect.arrayContaining(['corny', 'sanke25', 'sanke50']));
  });

  test('each preset has volume and diameter', () => {
    VESSEL_PRESETS.forEach((v) => {
      expect(v.volume).toBeGreaterThan(0);
      expect(v.diameter).toBeGreaterThan(0);
    });
  });
});
