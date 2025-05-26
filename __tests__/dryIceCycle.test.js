const physics = require('../physics.js');
Object.assign(global, {
  C_P_AIR: 1004,
  EPSILON: 0.622,
  R_AIR: 287,
  airDensity: physics.airDensity
});
const dry = require('../dry-ice-cycle.js');

describe('dry-ice-cycle helpers', () => {
  test('calculateSaturationPressureCO2 reasonable value', () => {
    const val = dry.calculateSaturationPressureCO2(200);
    expect(val).toBeGreaterThan(8e5);
    expect(val).toBeLessThan(9e5);
  });

  test('sublimationRateCO2 positive', () => {
    const rate = dry.sublimationRateCO2(200, 1000, 100000, 100);
    expect(rate).toBeGreaterThan(0);
  });

  test('calculateCO2CondensationRateFactor scales with temperature', () => {
    const res = dry.calculateCO2CondensationRateFactor({
      zoneArea: 1000,
      co2VaporPressure: 500,
      dayTemperature: 180,
      nightTemperature: 170
    });
    expect(res).toBeCloseTo(187.5, 1);
  });
});
