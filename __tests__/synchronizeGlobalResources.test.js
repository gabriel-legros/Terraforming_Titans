const { getPlanetParameters } = require('../planet-parameters.js');
const { getZonePercentage } = require('../zones.js');
const EffectableEntity = require('../effectable-entity.js');
const lifeParameters = require('../life-parameters.js');

// Globals required by terraforming.js
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;

const Terraforming = require('../terraforming.js');

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
});
