const { calculatePrecipitationRateFactor, boilingPointWater } = require('../src/js/water-cycle.js');
const { calculateMethaneCondensationRateFactor, boilingPointMethane } = require('../src/js/hydrocarbon-cycle.js');

describe('condensation stops above boiling point', () => {
  test('water precipitation zero when above boiling', () => {
    const atmPressure = 101325; // Pa
    const boil = boilingPointWater(atmPressure);
    const res = calculatePrecipitationRateFactor({
      zoneArea: 1e6,
      waterVaporPressure: 150000,
      gravity: 9.81,
      dayTemperature: boil + 6,
      nightTemperature: boil + 6,
      atmPressure
    });
    expect(res.rainfallRateFactor).toBe(0);
    expect(res.snowfallRateFactor).toBe(0);
  });

  test('methane condensation zero when above boiling', () => {
    const atmPressure = 101325;
    const boil = boilingPointMethane(atmPressure);
    const res = calculateMethaneCondensationRateFactor({
      zoneArea: 1e6,
      methaneVaporPressure: 100000,
      dayTemperature: boil + 6,
      nightTemperature: boil + 6,
      atmPressure
    });
    expect(res.liquidRateFactor).toBe(0);
    expect(res.iceRateFactor).toBe(0);
  });
});
