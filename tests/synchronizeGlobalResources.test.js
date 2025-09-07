const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

// Globals required by terraforming.js
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;

const Terraforming = require('../src/js/terraforming.js');

// Disable expensive updates
Terraforming.prototype.updateLuminosity = function() {};
Terraforming.prototype.updateSurfaceTemperature = function() {};

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

describe('synchronizeGlobalResources', () => {
  test('includes buried ice in global ice amount', () => {
    const params = getPlanetParameters('mars');
    const resources = createResources(params.resources);
    global.resources = resources;

    const terra = new Terraforming(resources, params.celestialParameters);

    // reset initial global amounts
    resources.surface.ice.value = 0;
    resources.surface.liquidWater.value = 0;
    resources.surface.dryIce.value = 0;
    resources.surface.biomass.value = 0;

    terra.zonalWater.tropical.ice = 100;
    terra.zonalWater.tropical.buriedIce = 200;
    terra.zonalWater.temperate.ice = 150;
    terra.zonalWater.temperate.buriedIce = 50;
    terra.zonalWater.polar.ice = 300;
    terra.zonalWater.polar.buriedIce = 100;

    terra.synchronizeGlobalResources();

    expect(resources.surface.ice.value).toBe(900);
  });

  test('sums liquid CO2 from zonal data', () => {
    const params = getPlanetParameters('mars');
    const resources = createResources(params.resources);
    global.resources = resources;

    const terra = new Terraforming(resources, params.celestialParameters);

    resources.surface.liquidCO2.value = 0;

    terra.zonalCO2.tropical.liquid = 10;
    terra.zonalCO2.temperate.liquid = 20;
    terra.zonalCO2.polar.liquid = 30;

    terra.synchronizeGlobalResources();

    expect(resources.surface.liquidCO2.value).toBe(60);
  });

  test('sums dry ice from zonal data', () => {
    const params = getPlanetParameters('mars');
    const resources = createResources(params.resources);
    global.resources = resources;

    const terra = new Terraforming(resources, params.celestialParameters);

    resources.surface.dryIce.value = 0;

    terra.zonalCO2.tropical.ice = 10;
    terra.zonalCO2.temperate.ice = 20;
    terra.zonalCO2.polar.ice = 30;

    terra.synchronizeGlobalResources();

    expect(resources.surface.dryIce.value).toBe(60);
  });
});
