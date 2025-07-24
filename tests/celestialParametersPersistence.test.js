const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.synchronizeGlobalResources = function(){};
Terraforming.prototype._updateZonalCoverageCache = function(){};

describe('celestial parameter persistence', () => {
  test('saveState includes current and initial parameters', () => {
    const terra = new Terraforming({}, { radius: 1, distanceFromSun: 1, gravity: 1 });
    terra.celestialParameters.distanceFromSun = 2;
    const saved = terra.saveState();
    expect(saved.celestialParameters.distanceFromSun).toBe(2);
    expect(saved.initialCelestialParameters.distanceFromSun).toBe(1);
  });

  test('loadState merges config and derives missing initial', () => {
    const terra = new Terraforming({}, { radius: 1, distanceFromSun: 1, gravity: 1 });
    const state = { celestialParameters: { distanceFromSun: 3 } };
    global.currentPlanetParameters = {
      celestialParameters: { radius: 1, distanceFromSun: 1, gravity: 1 },
      resources: { surface: {}, atmospheric: {} }
    };
    global.resources = { surface: {}, atmospheric: {}, colony: {}, special: {} };
    global.getZonePercentage = () => 0.33;
    global.ZONES = ['tropical','temperate','polar'];
    terra.calculateInitialValues = function(){};
    terra.loadState(state);
    expect(terra.celestialParameters.distanceFromSun).toBe(3);
    expect(terra.celestialParameters.gravity).toBe(1);
    expect(terra.initialCelestialParameters.distanceFromSun).toBe(3);
    expect(terra.initialCelestialParameters.gravity).toBe(1);
  });
});
