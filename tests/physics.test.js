const { calculateAtmosphericPressure, effectiveTemp, calculateEmissivity, calculateActualAlbedoPhysics, opticalDepth } = require('../src/js/physics.js');

describe('physics helpers', () => {
  test('calculateAtmosphericPressure basic case', () => {
    const p = calculateAtmosphericPressure(1, 10, 1); // 1 tonne, g=10, radius=1km
    expect(p).toBeCloseTo(0.0007957747, 8);
  });

  test('effectiveTemp black body calculation', () => {
    const T = effectiveTemp(0.5, 1000);
    expect(T).toBeCloseTo(216.6828649, 5);
  });

  test('calculateEmissivity uses optical depth', () => {
    const comp = { ch4: 0.5 };
    const pBar = 2;
    const { total: tau } = opticalDepth(comp, pBar, 9.81);
    const { emissivity, tau: emissivityTau, contributions } = calculateEmissivity(comp, pBar, 9.81);
    expect(emissivity).toBeGreaterThan(0);
    expect(emissivity).toBeLessThan(1);
    expect(emissivityTau).toBeCloseTo(tau);
    expect(contributions.ch4).toBeCloseTo(tau);
  });

  test('calculateActualAlbedoPhysics includes clouds and haze', () => {
    const res = calculateActualAlbedoPhysics(0.3, 1, { h2o: 0.02 }, 9.81);
    expect(res.albedo).toBeGreaterThan(0.3);
    expect(res.cfCloud).toBeGreaterThan(0);
    expect(res.cfHaze).toBeGreaterThan(0);
  });
});
