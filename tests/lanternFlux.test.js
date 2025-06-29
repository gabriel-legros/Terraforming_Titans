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
  test('uses cross section area', () => {
    const terra = new Terraforming({}, { radius: 1 });
    terra.hyperionLantern.built = true;
    terra.hyperionLantern.active = 1;
    terra.hyperionLantern.powerPerInvestment = 100;
    const expected = 100 / (Math.PI * 1000 * 1000);
    expect(terra.calculateLanternFlux()).toBeCloseTo(expected, 5);
  });
});
