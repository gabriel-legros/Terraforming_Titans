const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};
const Terraforming = require('../src/js/terraforming.js');

// Avoid heavy initialization
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

describe('zonal solar panel multiplier', () => {
  test('applies Cloud & Haze penalty', () => {
    global.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } } };
    global.buildings = { spaceMirror: { active: 0 } };
    global.colonies = {};
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 });
    tf.luminosity.zonalFluxes = { tropical: 1500 };
    tf.luminosity.cloudHazePenalty = 0.2;
    expect(tf.calculateZonalSolarPanelMultiplier('tropical')).toBeCloseTo(1.2);
  });
});
