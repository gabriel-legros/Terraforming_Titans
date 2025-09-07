const physics = require('../src/js/physics.js');
const { condensationRateFactor } = require('../src/js/condensation-utils.js');
const water = require('../src/js/water-cycle.js');
const hydrocarbon = require('../src/js/hydrocarbon-cycle.js');
const dryIce = require('../src/js/dry-ice-cycle.js');

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
      saturationFn: water.saturationVaporPressureMK,
      freezePoint: 273.15
    });
    expect(res.liquidRate).toBeCloseTo(0.0871088754676007);
    expect(res.iceRate).toBeCloseTo(0.002246246821741467);
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
      saturationFn: water.saturationVaporPressureMK,
      freezePoint: 273.15,
      boilingPoint: water.boilingPointWater(params.atmPressure),
      boilTransitionRange: 5
    });
    const res = water.waterCycle.condensationRateFactor({
      zoneArea: params.zoneArea,
      vaporPressure: params.waterVaporPressure,
      gravity: params.gravity,
      dayTemp: params.dayTemperature,
      nightTemp: params.nightTemperature,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: water.boilingPointWater(params.atmPressure),
      boilTransitionRange: 5
    });
    expect(res.liquidRate).toBeCloseTo(expected.liquidRate);
    expect(res.iceRate).toBeCloseTo(expected.iceRate);
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
    const res = hydrocarbon.methaneCycle.condensationRateFactor({
      zoneArea: params.zoneArea,
      vaporPressure: params.methaneVaporPressure,
      gravity: 1,
      dayTemp: params.dayTemperature,
      nightTemp: params.nightTemperature,
      transitionRange: 2,
      maxDiff: 10,
      boilingPoint: hydrocarbon.boilingPointMethane(params.atmPressure),
      boilTransitionRange: 5
    });
    expect(res.liquidRate).toBeCloseTo(expected.liquidRate);
    expect(res.iceRate).toBeCloseTo(expected.iceRate);
  });
});

describe('evaporation and sublimation rates parity', () => {
  test('cycle methods match legacy calculations', () => {
    const params = {
      zoneArea: 1e6,
      liquidWaterCoverage: 0.4,
      iceCoverage: 0.2,
      dryIceCoverage: 0.1,
      dayTemperature: 270,
      nightTemperature: 265,
      waterVaporPressure: 500,
      co2VaporPressure: 400,
      avgAtmPressure: 800,
      zonalSolarFlux: 1500,
    };

    function oldCalc(p) {
      const { zoneArea, liquidWaterCoverage, iceCoverage, dryIceCoverage, dayTemperature, nightTemperature, waterVaporPressure, co2VaporPressure, avgAtmPressure, zonalSolarFlux } = p;
      const liquidArea = zoneArea * liquidWaterCoverage;
      const iceArea = zoneArea * iceCoverage;
      const dryIceArea = zoneArea * dryIceCoverage;
      const dayFlux = 2 * zonalSolarFlux;
      const nightFlux = 0;
      let dayEvap = 0, nightEvap = 0, dayWaterSubl = 0, nightWaterSubl = 0, dayCo2Subl = 0, nightCo2Subl = 0;
      if (liquidArea > 0) {
        dayEvap = water.evaporationRateWater(dayTemperature, dayFlux, avgAtmPressure, waterVaporPressure, 100) * liquidArea / 1000;
        nightEvap = water.evaporationRateWater(nightTemperature, nightFlux, avgAtmPressure, waterVaporPressure, 100) * liquidArea / 1000;
      }
      if (iceArea > 0) {
        dayWaterSubl = water.sublimationRateWater(dayTemperature, dayFlux, avgAtmPressure, waterVaporPressure, 100) * iceArea / 1000;
        nightWaterSubl = water.sublimationRateWater(nightTemperature, nightFlux, avgAtmPressure, waterVaporPressure, 100) * iceArea / 1000;
      }
      if (dryIceArea > 0) {
        dayCo2Subl = dryIce.sublimationRateCO2(dayTemperature, dayFlux, avgAtmPressure, co2VaporPressure, 100) * dryIceArea / 1000;
        nightCo2Subl = dryIce.sublimationRateCO2(nightTemperature, nightFlux, avgAtmPressure, co2VaporPressure, 100) * dryIceArea / 1000;
      }
      return {
        evaporationRate: (dayEvap + nightEvap) / 2,
        waterSublimationRate: (dayWaterSubl + nightWaterSubl) / 2,
        co2SublimationRate: (dayCo2Subl + nightCo2Subl) / 2,
      };
    }

    function newCalc(p) {
      const { zoneArea, liquidWaterCoverage, iceCoverage, dryIceCoverage, dayTemperature, nightTemperature, waterVaporPressure, co2VaporPressure, avgAtmPressure, zonalSolarFlux } = p;
      const liquidArea = zoneArea * liquidWaterCoverage;
      const iceArea = zoneArea * iceCoverage;
      const dryIceArea = zoneArea * dryIceCoverage;
      const dayFlux = 2 * zonalSolarFlux;
      const nightFlux = 0;
      let dayEvap = 0, nightEvap = 0, dayWaterSubl = 0, nightWaterSubl = 0, dayCo2Subl = 0, nightCo2Subl = 0;
      if (liquidArea > 0) {
        dayEvap = water.waterCycle.evaporationRate({ T: dayTemperature, solarFlux: dayFlux, atmPressure: avgAtmPressure, vaporPressure: waterVaporPressure, r_a: 100, albedo: 0.3 }) * liquidArea / 1000;
        nightEvap = water.waterCycle.evaporationRate({ T: nightTemperature, solarFlux: nightFlux, atmPressure: avgAtmPressure, vaporPressure: waterVaporPressure, r_a: 100, albedo: 0.3 }) * liquidArea / 1000;
      }
      if (iceArea > 0) {
        dayWaterSubl = water.waterCycle.sublimationRate({ T: dayTemperature, solarFlux: dayFlux, atmPressure: avgAtmPressure, vaporPressure: waterVaporPressure, r_a: 100 }) * iceArea / 1000;
        nightWaterSubl = water.waterCycle.sublimationRate({ T: nightTemperature, solarFlux: nightFlux, atmPressure: avgAtmPressure, vaporPressure: waterVaporPressure, r_a: 100 }) * iceArea / 1000;
      }
      if (dryIceArea > 0) {
        dayCo2Subl = dryIce.co2Cycle.sublimationRate({ T: dayTemperature, solarFlux: dayFlux, atmPressure: avgAtmPressure, vaporPressure: co2VaporPressure, r_a: 100 }) * dryIceArea / 1000;
        nightCo2Subl = dryIce.co2Cycle.sublimationRate({ T: nightTemperature, solarFlux: nightFlux, atmPressure: avgAtmPressure, vaporPressure: co2VaporPressure, r_a: 100 }) * dryIceArea / 1000;
      }
      return {
        evaporationRate: (dayEvap + nightEvap) / 2,
        waterSublimationRate: (dayWaterSubl + nightWaterSubl) / 2,
        co2SublimationRate: (dayCo2Subl + nightCo2Subl) / 2,
      };
    }

    const oldRes = oldCalc(params);
    const newRes = newCalc(params);
    expect(newRes.evaporationRate).toBeCloseTo(oldRes.evaporationRate);
    expect(newRes.waterSublimationRate).toBeCloseTo(oldRes.waterSublimationRate);
    expect(newRes.co2SublimationRate).toBeCloseTo(oldRes.co2SublimationRate);
  });
});
