const { calculateAtmosphericPressure, calculateEffectiveTemperatureNoAtm, calculateEmissivity } = require('../physics.js');

describe('physics helpers', () => {
  test('calculateAtmosphericPressure basic case', () => {
    const p = calculateAtmosphericPressure(1, 10, 1); // 1 tonne, g=10, radius=1km
    expect(p).toBeCloseTo(0.0007957747, 8);
  });

  test('calculateEffectiveTemperatureNoAtm', () => {
    const T = calculateEffectiveTemperatureNoAtm(1000, 0.5, 1);
    expect(T).toBeCloseTo(306.4358463, 5);
  });

  test('calculateEmissivity uses optical depth', () => {
    const e = calculateEmissivity({ co2: 0.5 }, 1);
    expect(e).toBeGreaterThan(0);
    expect(e).toBeLessThan(1);
  });
});
