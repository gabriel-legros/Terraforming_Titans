const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.resources = { atmospheric: {} };

const Terraforming = require('../src/js/terraforming.js');

Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.calculateLanternFlux = function(){ return 0; };

describe('star luminosity affects solar flux', () => {
  afterEach(() => {
    Terraforming.setStarLuminosity(1);
  });

  test('flux scales with star luminosity multiplier', () => {
    const terra = new Terraforming({}, { radius: 1, distanceFromSun: 1, albedo: 0, gravity: 1, starLuminosity: 2 });
    const flux = terra.calculateSolarFlux(149597870700);
    expect(flux).toBeCloseTo(2722, 0);
  });
});
