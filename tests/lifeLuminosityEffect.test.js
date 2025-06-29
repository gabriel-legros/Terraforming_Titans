const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};
const Terraforming = require('../src/js/terraforming.js');
// Disable heavy initialization in constructor
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

describe('luminosity life growth effect', () => {
  test('applyTerraformingEffects adds life growth multiplier based on luminosity', () => {
    global.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } } };
    global.buildings = { spaceMirror: { active: 0 } };
    global.colonies = {};
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    const lifeManager = new EffectableEntity({ description: 'life' });
    global.lifeManager = lifeManager;
    global.oreScanner = {};

    // dummy addEffect to route effects directly
    global.addEffect = (effect) => {
      if (effect.target === 'lifeManager') {
        lifeManager.addAndReplace(effect);
      }
    };

    const celestial = { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 };
    const tf = new Terraforming(global.resources, celestial);
    tf.luminosity.modifiedSolarFlux = 2000; // results in multiplier 2

    tf.applyTerraformingEffects();

    const effect = lifeManager.activeEffects.find(e => e.type === 'lifeGrowthMultiplier');
    expect(effect).toBeDefined();
    expect(effect.value).toBeCloseTo(2);
  });
});
