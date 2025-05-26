const physics = require('../physics.js');
Object.assign(global, {
  C_P_AIR: 1004,
  EPSILON: 0.622,
  R_AIR: 287,
  airDensity: physics.airDensity
});
const water = require('../water-cycle.js');
const dry = require('../dry-ice-cycle.js');
Object.assign(global, { sublimationRateCO2: dry.sublimationRateCO2 });

describe('water-cycle helpers', () => {
  test('saturationVaporPressureBuck matches expected values', () => {
    expect(water.saturationVaporPressureBuck(273.15)).toBeCloseTo(611.21, 2);
    expect(water.saturationVaporPressureBuck(300)).toBeCloseTo(3535.24, 2);
  });

  test('evaporationRateWater positive and finite', () => {
    const rate = water.evaporationRateWater(300, 1000, 100000, 500, 100);
    expect(rate).toBeGreaterThan(0);
    expect(Number.isFinite(rate)).toBe(true);
  });

  test('calculateEvaporationSublimationRates returns averages', () => {
    const res = water.calculateEvaporationSublimationRates({
      zoneArea: 1000,
      liquidWaterCoverage: 0.5,
      iceCoverage: 0.3,
      dryIceCoverage: 0,
      dayTemperature: 300,
      nightTemperature: 290,
      waterVaporPressure: 500,
      co2VaporPressure: 100,
      avgAtmPressure: 100000,
      zonalSolarFlux: 200
    });
    expect(res.evaporationRate).toBeGreaterThan(0);
    expect(res.waterSublimationRate).toBeGreaterThan(0);
    expect(res.co2SublimationRate).toBe(0);
  });

  test('calculatePrecipitationRateFactor yields snow when cold', () => {
    const res = water.calculatePrecipitationRateFactor({
      zoneArea: 1000,
      waterVaporPressure: 1000,
      gravity: 10,
      dayTemperature: 280,
      nightTemperature: 270
    });
    expect(res.snowfallRateFactor).toBeGreaterThan(0);
    expect(res.rainfallRateFactor).toBeGreaterThan(0);
  });
});
