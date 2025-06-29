const EffectableEntity = require('../src/js/effectable-entity.js');
// expose class globally before requiring Building
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

global.lifeParameters = {};
const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

function createWindTurbine() {
  const config = {
    name: 'Wind',
    category: 'energy',
    cost: { colony: { metal: 10 } },
    consumption: {},
    production: { colony: { energy: 1 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: true,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new Building(config, 'windTurbine');
}

describe('wind turbine production effect', () => {
  test('applyTerraformingEffects adds production multiplier based on pressure', () => {
    global.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } } };
    global.maintenanceFraction = 0.1;
    global.buildings = { windTurbine: createWindTurbine(), spaceMirror: { active: 0 } };
    global.colonies = {};
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = {};
    global.oreScanner = {};

    // intercept addEffect to apply to our building
    global.addEffect = (effect) => {
      if (effect.target === 'building' && effect.targetId === 'windTurbine') {
        global.buildings.windTurbine.addAndReplace(effect);
      }
    };

    const celestial = { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 };
    const tf = new Terraforming(global.resources, celestial);
    // stub total pressure to 4.053 kPa (~0.04 atm) so multiplier = 0.2
    tf.calculateTotalPressure = () => 4.053;

    tf.applyTerraformingEffects();

    const effect = global.buildings.windTurbine.activeEffects.find(e => e.type === 'productionMultiplier');
    expect(effect).toBeDefined();
    expect(effect.value).toBeCloseTo(0.2);
  });
});
