const physics = require('../src/js/physics.js');
const { condensationRateFactor } = require('../src/js/condensation-utils.js');
const water = require('../src/js/water-cycle.js');
const hydrocarbon = require('../src/js/hydrocarbon-cycle.js');

global.airDensity = physics.airDensity;
// constants used by phase-change-utils
global.C_P_AIR = 1004;
global.EPSILON = 0.622;

describe('condensationRateFactor generic helper', () => {
  test('computes expected water precipitation factors', () => {
    const res = condensationRateFactor({
      zoneArea: 1e6,
      vaporPressure: 800,
      gravity: 9.81,
      dayTemp: 276,
      nightTemp: 275,
      saturationFn: water.saturationVaporPressureBuck,
      freezePoint: 273.15
    });
    expect(res.liquidRate).toBeCloseTo(0.0871865839926258);
    expect(res.iceRate).toBeCloseTo(0.002247384412881595);
  });

  test('computes expected methane condensation factors', () => {
    const res = condensationRateFactor({
      zoneArea: 1e6,
      vaporPressure: 30000,
      gravity: 1,
      dayTemp: 94,
      nightTemp: 93,
      saturationFn: hydrocarbon.calculateSaturationPressureMethane,
      freezePoint: 90.7
    });
    expect(res.liquidRate).toBeCloseTo(105.91228911346302);
    expect(res.iceRate).toBeCloseTo(0);
  });
});

describe('cycle wrappers match helper output', () => {
  test('water wrapper delegates correctly', () => {
    const params = {
      zoneArea: 1e6,
      waterVaporPressure: 800,
      gravity: 9.81,
      dayTemperature: 276,
      nightTemperature: 275,
      atmPressure: 101325
    };
    const expected = condensationRateFactor({
      zoneArea: params.zoneArea,
      vaporPressure: params.waterVaporPressure,
      gravity: params.gravity,
      dayTemp: params.dayTemperature,
      nightTemp: params.nightTemperature,
      saturationFn: water.saturationVaporPressureBuck,
      freezePoint: 273.15,
      boilingPoint: water.boilingPointWater(params.atmPressure),
      boilTransitionRange: 5
    });
    const res = water.calculatePrecipitationRateFactor(params);
    expect(res.rainfallRateFactor).toBeCloseTo(expected.liquidRate);
    expect(res.snowfallRateFactor).toBeCloseTo(expected.iceRate);
  });

  test('methane wrapper delegates correctly', () => {
    const params = {
      zoneArea: 1e6,
      methaneVaporPressure: 30000,
      dayTemperature: 94,
      nightTemperature: 93,
      atmPressure: 101325
    };
    const expected = condensationRateFactor({
      zoneArea: params.zoneArea,
      vaporPressure: params.methaneVaporPressure,
      gravity: 1,
      dayTemp: params.dayTemperature,
      nightTemp: params.nightTemperature,
      saturationFn: hydrocarbon.calculateSaturationPressureMethane,
      freezePoint: 90.7,
      boilingPoint: hydrocarbon.boilingPointMethane(params.atmPressure),
      boilTransitionRange: 5
    });
    const res = hydrocarbon.calculateMethaneCondensationRateFactor(params);
    expect(res.liquidRateFactor).toBeCloseTo(expected.liquidRate);
    expect(res.iceRateFactor).toBeCloseTo(expected.iceRate);
  });
});
