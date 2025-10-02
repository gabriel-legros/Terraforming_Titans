const { methaneCycle, boilingPointMethane } = require('../src/js/hydrocarbon-cycle.js');

describe('methane condensation smoothing around freezing', () => {
  const zoneArea = 1e6; // m^2
  const methaneVaporPressure = 30000; // Pa - ensure above saturation
  const atmPressure = 150000;

  test('above freezing favors liquid', () => {
    const { liquidRate, iceRate } = methaneCycle.condensationRateFactor({
      zoneArea,
      vaporPressure: methaneVaporPressure,
      gravity: 1,
      dayTemp: 94,
      nightTemp: 93,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boilingPointMethane(atmPressure),
      boilTransitionRange: 5
    });
    expect(liquidRate).toBeGreaterThan(0);
    expect(liquidRate).toBeGreaterThan(iceRate);
  });

  test('below freezing gives mostly ice', () => {
    const { liquidRate, iceRate } = methaneCycle.condensationRateFactor({
      zoneArea,
      vaporPressure: methaneVaporPressure,
      gravity: 1,
      dayTemp: 88,
      nightTemp: 89,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boilingPointMethane(atmPressure),
      boilTransitionRange: 5
    });
    expect(iceRate).toBeGreaterThan(liquidRate);
    expect(iceRate).toBeGreaterThan(0);
  });

  test('temperatures near freezing mix liquid and ice', () => {
    const { liquidRate, iceRate } = methaneCycle.condensationRateFactor({
      zoneArea,
      vaporPressure: methaneVaporPressure,
      gravity: 1,
      dayTemp: 91,
      nightTemp: 90,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boilingPointMethane(atmPressure),
      boilTransitionRange: 5
    });
    expect(liquidRate).toBeGreaterThan(0);
    expect(iceRate).toBeGreaterThan(0);
  });
});
