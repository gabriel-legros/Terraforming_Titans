const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};
const Terraforming = require('../src/js/terraforming.js');
// Disable heavy initialization in constructor
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

describe('luminosity life growth effect', () => {
  test('zonal solar panel multiplier uses zonal flux when available', () => {
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

    const celestial = { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 };
    const tf = new Terraforming(global.resources, celestial);
    tf.luminosity.zonalFluxes = { tropical: 1500, temperate: 1000, polar: 500 };

    expect(tf.calculateZonalSolarPanelMultiplier('tropical')).toBeCloseTo(1.5);
    expect(tf.calculateZonalSolarPanelMultiplier('temperate')).toBeCloseTo(1);
    expect(tf.calculateZonalSolarPanelMultiplier('polar')).toBeCloseTo(0.5);
  });
});
