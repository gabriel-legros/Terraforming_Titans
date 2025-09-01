const { waterCycle, boilingPointWater } = require('../src/js/water-cycle.js');

describe('precipitation smoothing around freezing', () => {
  const zoneArea = 1e6; // m^2
  const waterVaporPressure = 800; // Pa
  const gravity = 9.81;
  const atmPressure = 101325;

  test('above freezing gives predominantly rain', () => {
    const { liquidRate, iceRate } = waterCycle.condensationRateFactor({
      zoneArea,
      vaporPressure: waterVaporPressure,
      gravity,
      dayTemp: 276,
      nightTemp: 275,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boilingPointWater(atmPressure),
      boilTransitionRange: 5
    });
    expect(liquidRate).toBeGreaterThan(0);
    expect(liquidRate).toBeGreaterThan(iceRate);
  });

  test('below freezing gives snow only', () => {
    const { liquidRate, iceRate } = waterCycle.condensationRateFactor({
      zoneArea,
      vaporPressure: waterVaporPressure,
      gravity,
      dayTemp: 270,
      nightTemp: 271,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boilingPointWater(atmPressure),
      boilTransitionRange: 5
    });
    expect(liquidRate).toBe(0);
    expect(iceRate).toBeGreaterThan(0);
  });

  test('temperatures straddling freezing mix rain and snow', () => {
    const { liquidRate, iceRate } = waterCycle.condensationRateFactor({
      zoneArea,
      vaporPressure: waterVaporPressure,
      gravity,
      dayTemp: 274,
      nightTemp: 272,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: boilingPointWater(atmPressure),
      boilTransitionRange: 5
    });
    expect(liquidRate).toBeGreaterThan(0);
    expect(iceRate).toBeGreaterThan(0);
  });
});
