const { getPlanetParameters } = require('../planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../zones.js');
const EffectableEntity = require('../effectable-entity.js');
const lifeParameters = require('../life-parameters.js');
const physics = require('../physics.js');
const { calculateAverageCoverage, calculateZonalCoverage } = require('../terraforming-utils.js');

// globals expected by terraforming.js
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.calculateEmissivity = physics.calculateEmissivity;
global.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
global.effectiveTemp = physics.effectiveTemp;
global.surfaceAlbedoMix = physics.surfaceAlbedoMix;
global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };

const Terraforming = require('../terraforming.js');

function createResources(config) {
  const res = {};
  for (const cat in config) {
    res[cat] = {};
    for (const name in config[cat]) {
      const val = config[cat][name].initialValue || 0;
      res[cat][name] = { value: val };
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
    terra.calculateInitialValues();

    const expectedStatus = calculateAverageCoverage(terra, 'liquidWater') > terra.waterTarget;
    expect(terra.getWaterStatus()).toBe(expectedStatus);
  });

  test('calculateZonalCoverage returns bounded values', () => {
    const params = getPlanetParameters('mars');
    const res = createResources(params.resources);
    const terra = new Terraforming(res, params.celestialParameters);
    terra.zonalWater.tropical.liquid = 2e6;
    const cov = calculateZonalCoverage(terra, 'tropical', 'liquidWater');
    expect(cov).toBeGreaterThanOrEqual(0);
    expect(cov).toBeLessThanOrEqual(1);
  });
});
