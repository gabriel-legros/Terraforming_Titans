const { calculatePrecipitationRateFactor } = require('../water-cycle.js');

describe('precipitation smoothing around freezing', () => {
  const zoneArea = 1e6; // m^2
  const waterVaporPressure = 800; // Pa
  const gravity = 9.81;

  test('above freezing gives predominantly rain', () => {
    const res = calculatePrecipitationRateFactor({
      zoneArea,
      waterVaporPressure,
      gravity,
      dayTemperature: 276,
      nightTemperature: 275,
    });
    expect(res.rainfallRateFactor).toBeGreaterThan(0);
    expect(res.rainfallRateFactor).toBeGreaterThan(res.snowfallRateFactor);
  });

  test('below freezing gives snow only', () => {
    const res = calculatePrecipitationRateFactor({
      zoneArea,
      waterVaporPressure,
      gravity,
      dayTemperature: 270,
      nightTemperature: 271,
    });
    expect(res.rainfallRateFactor).toBe(0);
    expect(res.snowfallRateFactor).toBeGreaterThan(0);
  });

  test('temperatures straddling freezing mix rain and snow', () => {
    const res = calculatePrecipitationRateFactor({
      zoneArea,
      waterVaporPressure,
      gravity,
      dayTemperature: 274,
      nightTemperature: 272,
    });
    expect(res.rainfallRateFactor).toBeGreaterThan(0);
    expect(res.snowfallRateFactor).toBeGreaterThan(0);
  });
});
