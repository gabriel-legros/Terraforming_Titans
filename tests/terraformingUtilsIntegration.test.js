const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage, estimateCoverage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const dryIce = require('../src/js/dry-ice-cycle.js');
const { calculateAverageCoverage } = require('../src/js/terraforming-utils.js');
const { calculateEvaporationSublimationRates } = require('../src/js/terraforming/water-cycle.js');

// globals expected by terraforming.js
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.projectManager = { projects: { spaceMirrorFacility: { isBooleanFlagSet: () => false } }, isBooleanFlagSet: () => false };
global.mirrorOversightSettings = {};
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.calculateEmissivity = physics.calculateEmissivity;
global.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
global.effectiveTemp = physics.effectiveTemp;
global.surfaceAlbedoMix = physics.surfaceAlbedoMix;
global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };
global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;
global.airDensity = physics.airDensity;
global.sublimationRateCO2 = dryIce.sublimationRateCO2;
global.calculateCO2CondensationRateFactor = dryIce.calculateCO2CondensationRateFactor;

const Terraforming = require('../src/js/terraforming.js');

function createResources(config) {
  const res = {};
  for (const cat in config) {
    res[cat] = {};
    for (const name in config[cat]) {
      const val = config[cat][name].initialValue || 0;
      res[cat][name] = { value: val, modifyRate: () => {} };
    }
  }
  return res;
}

describe('terraforming-utils integration', () => {
  test('getWaterStatus uses shared coverage helpers', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const res = createResources(params.resources);
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);

    // set some water for coverage
    terra.zonalWater.tropical.liquid = 1e6;
    terra.zonalWater.temperate.liquid = 5e5;
    terra.calculateInitialValues(params);
    terra._updateZonalCoverageCache();

    const expectedStatus = calculateAverageCoverage(terra, 'liquidWater') > terra.waterTarget;
    expect(terra.getWaterStatus()).toBe(expectedStatus);
  });

  test('coverage and evaporation ignore buried ice', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const res = createResources(params.resources);
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);

    terra.calculateInitialValues(params);

    terra.zonalWater.polar.ice = 1000;
    const zoneArea = terra.celestialParameters.surfaceArea * getZonePercentage('polar');
    const initialCov = estimateCoverage(terra.zonalWater.polar.ice, zoneArea, 0.01);

    terra.zonalWater.polar.buriedIce = 5000;
    const covWithBuried = estimateCoverage(terra.zonalWater.polar.ice, zoneArea, 0.01);
    expect(covWithBuried).toBeCloseTo(initialCov, 5);

    // remove all surface water and ice so only buried ice remains
    for (const z of ['tropical','temperate','polar']) {
      terra.zonalWater[z].ice = 0;
      terra.zonalWater[z].liquid = 0;
    }

    terra._updateZonalCoverageCache();

    const cache = terra.zonalCoverageCache.polar;
    const rates = calculateEvaporationSublimationRates({
      zoneArea: cache.zoneArea,
      liquidWaterCoverage: cache.liquidWater,
      iceCoverage: cache.ice,
      dryIceCoverage: cache.dryIce,
      dayTemperature: 260,
      nightTemperature: 250,
      waterVaporPressure: 0,
      co2VaporPressure: 0,
      avgAtmPressure: 600,
      zonalSolarFlux: 1000
    });
    expect(rates.waterSublimationRate).toBe(0);
  });
});
