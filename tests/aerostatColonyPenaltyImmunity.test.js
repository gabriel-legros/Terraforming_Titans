const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};

describe('aerostat colony penalties', () => {
  test('aerostat colony ignores temperature and pressure penalties', () => {
    global.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } }, surface: {}, colony: {} };
    global.buildings = {};
    global.colonies = { aerostat_colony: {} };
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun: 1, radius: 1, gravity: 1, albedo: 0 });
    tf.calculateTotalPressure = () => 405.3; // trigger pressure penalty
    tf.calculateColonyEnergyPenalty = () => 2;
    tf.calculateMaintenancePenalty = () => 2;
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    tf.applyTerraformingEffects();

    const calls = mockAdd.mock.calls.map(c => c[0]);
    expect(calls).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: 'aerostat_colony', effectId: 'pressureCostPenalty-metal' }),
      expect.objectContaining({ targetId: 'aerostat_colony', effectId: 'pressureCostPenalty-glass' }),
      expect.objectContaining({ targetId: 'aerostat_colony', effectId: 'temperaturePenalty' }),
      expect.objectContaining({ targetId: 'aerostat_colony', effectId: 'temperatureMaintenancePenalty' })
    ]));

    global.addEffect = originalAdd;
  });
});

