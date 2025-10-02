const { getZonePercentage } = require('../src/js/zones.js');
global.getZonePercentage = getZonePercentage;
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const lifeParameters = require('../src/js/life-parameters.js');
global.lifeParameters = lifeParameters;
const Terraforming = require('../src/js/terraforming.js');

Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

describe('Hyperion Lantern flux calculation', () => {
  test('uses cross section area when productivity unspecified', () => {
    const terra = new Terraforming({}, { radius: 1 });
    global.buildings = { hyperionLantern: { active: 1, powerPerBuilding: 100 } };
    const expected = 100 / (Math.PI * 1000 * 1000);
    expect(terra.calculateLanternFlux()).toBeCloseTo(expected, 5);
  });

  test('scales with productivity', () => {
    const terra = new Terraforming({}, { radius: 1 });
    global.buildings = { hyperionLantern: { active: 2, powerPerBuilding: 100, productivity: 0.5 } };
    const expected = 100 * 2 * 0.5 / (Math.PI * 1000 * 1000);
    expect(terra.calculateLanternFlux()).toBeCloseTo(expected, 5);
  });
});
