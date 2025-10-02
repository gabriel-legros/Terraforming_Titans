const { waterCycle, boilingPointWater } = require('../src/js/water-cycle.js');
const { methaneCycle, boilingPointMethane } = require('../src/js/hydrocarbon-cycle.js');

describe('condensation behavior relative to boiling point', () => {
  test('water condensation can occur above boiling', () => {
    const atmPressure = 101325; // Pa
    const boil = boilingPointWater(atmPressure);
    const { liquidRate, iceRate } = waterCycle.condensationRateFactor({
      zoneArea: 1e6,
      vaporPressure: 150000,
      gravity: 9.81,
      dayTemp: boil + 6,
      nightTemp: boil + 6,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boil,
      boilTransitionRange: 5
    });
    expect(liquidRate).toBeGreaterThan(0);
    expect(iceRate).toBe(0);
  });

  test('methane condensation can produce ice above boiling', () => {
    const atmPressure = 101325;
    const boil = boilingPointMethane(atmPressure);
    const { liquidRate, iceRate } = methaneCycle.condensationRateFactor({
      zoneArea: 1e6,
      vaporPressure: 100000,
      gravity: 1,
      dayTemp: boil + 6,
      nightTemp: boil + 6,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boil,
      boilTransitionRange: 5
    });
    expect(liquidRate).toBe(0);
    expect(iceRate).toBeGreaterThan(0);
  });
});
