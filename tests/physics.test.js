const { calculateAtmosphericPressure, effectiveTemp, calculateEmissivity } = require('../src/js/physics.js');

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
    const e = calculateEmissivity({ co2: 0.5 }, 1);
    expect(e).toBeGreaterThan(0);
    expect(e).toBeLessThan(1);
  });
});
