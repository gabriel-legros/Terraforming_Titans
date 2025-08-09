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

describe('zonal surface overrides', () => {
  test('dry ice values from parameters are used', () => {
    const params = getPlanetParameters('titan');
    global.currentPlanetParameters = params;
    const resources = createResources(params.resources);
    global.resources = resources;

    const terra = new Terraforming(resources, params.celestialParameters);
    terra.calculateInitialValues(params);

    expect(terra.zonalSurface.tropical.dryIce).toBeCloseTo(params.zonalSurface.tropical.dryIce);
    expect(terra.zonalSurface.temperate.dryIce).toBeCloseTo(params.zonalSurface.temperate.dryIce);
    expect(terra.zonalSurface.polar.dryIce).toBeCloseTo(params.zonalSurface.polar.dryIce);
    // Biomass not provided in parameters should default to 0
    expect(terra.zonalSurface.tropical.biomass).toBe(0);
  });
});
