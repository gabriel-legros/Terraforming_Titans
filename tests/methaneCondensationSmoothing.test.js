const { calculateMethaneCondensationRateFactor } = require('../src/js/hydrocarbon-cycle.js');

describe('methane condensation smoothing around freezing', () => {
  const zoneArea = 1e6; // m^2
  const methaneVaporPressure = 30000; // Pa - ensure above saturation
  const atmPressure = 101325;

  test('above freezing favors liquid', () => {
    const res = calculateMethaneCondensationRateFactor({
      zoneArea,
      methaneVaporPressure,
      dayTemperature: 94,
      nightTemperature: 93,
      atmPressure,
    });
    expect(res.liquidRateFactor).toBeGreaterThan(0);
    expect(res.liquidRateFactor).toBeGreaterThan(res.iceRateFactor);
  });

  test('below freezing gives mostly ice', () => {
    const res = calculateMethaneCondensationRateFactor({
      zoneArea,
      methaneVaporPressure,
      dayTemperature: 88,
      nightTemperature: 89,
      atmPressure,
    });
    expect(res.iceRateFactor).toBeGreaterThan(res.liquidRateFactor);
    expect(res.iceRateFactor).toBeGreaterThan(0);
  });

  test('temperatures near freezing mix liquid and ice', () => {
    const res = calculateMethaneCondensationRateFactor({
      zoneArea,
      methaneVaporPressure,
      dayTemperature: 91,
      nightTemperature: 90,
      atmPressure,
    });
    expect(res.liquidRateFactor).toBeGreaterThan(0);
    expect(res.iceRateFactor).toBeGreaterThan(0);
  });
});
