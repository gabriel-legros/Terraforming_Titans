const EffectableEntity = require('../src/js/effectable-entity.js');
// Minimal globals
global.EffectableEntity = EffectableEntity;
global.lifeParameters = {};

const Terraforming = require('../src/js/terraforming.js');
const {
  getFactoryTemperatureMaintenancePenaltyReduction
} = require('../src/js/buildings/aerostat.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.updateSurfaceRadiation = function(){};

describe('temperature maintenance penalty applies to buildings', () => {
  test('skips immune buildings', () => {
    global.resources = { atmospheric:{}, special:{ albedoUpgrades:{ value:0 } }, surface:{}, colony:{} };
    global.buildings = {
      normal: {},
      mirror: { temperatureMaintenanceImmune: true }
    };
    global.colonies = {};
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun:1, radius:1, gravity:1, albedo:0 });
    tf.temperature = { value: 473.15 };
    tf.calculateColonyEnergyPenalty = () => 1;
    tf.calculateMaintenancePenalty = () => 2;
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    tf.applyTerraformingEffects();

    const calls = mockAdd.mock.calls.map(c => c[0]);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'building', targetId: 'normal', type: 'maintenanceMultiplier', value: 2 })
    ]));
    expect(calls).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: 'mirror' })
    ]));

    global.addEffect = originalAdd;
  });

  test('reduces penalty for factories based on aerostat capacity', () => {
    global.resources = { atmospheric:{}, special:{ albedoUpgrades:{ value:0 } }, surface:{}, colony:{} };
    const factory = {
      active: 1,
      requiresWorker: 5,
      getTotalWorkerNeed: () => 5,
      getEffectiveWorkerMultiplier: () => 1
    };
    global.buildings = { factory };
    global.colonies = {
      aerostat_colony: {
        active: 1,
        storage: { colony: { colonists: 10 } },
        getEffectiveStorageMultiplier: () => 1
      }
    };
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun:1, radius:1, gravity:1, albedo:0 });
    tf.temperature = { value: 473.15 };
    tf.calculateColonyEnergyPenalty = () => 1;
    tf.calculateMaintenancePenalty = () => 2;
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    expect(getFactoryTemperatureMaintenancePenaltyReduction()).toBe(1);
    expect(tf.getFactoryTemperatureMaintenancePenaltyReduction()).toBe(1);

    tf.applyTerraformingEffects();

    const buildingPenalty = mockAdd.mock.calls
      .map(c => c[0])
      .find(e => e.target === 'building' && e.targetId === 'factory' && e.effectId === 'temperatureMaintenancePenalty');
    expect(buildingPenalty).toBeDefined();
    expect(buildingPenalty.value).toBe(1);

    global.addEffect = originalAdd;
  });

  test('applies partial reduction when aerostat capacity is limited', () => {
    global.resources = { atmospheric:{}, special:{ albedoUpgrades:{ value:0 } }, surface:{}, colony:{} };
    const factory = {
      active: 2,
      requiresWorker: 20,
      getTotalWorkerNeed: () => 20,
      getEffectiveWorkerMultiplier: () => 1
    };
    global.buildings = { factory };
    global.colonies = {
      aerostat_colony: {
        active: 1,
        storage: { colony: { colonists: 10 } },
        getEffectiveStorageMultiplier: () => 1
      }
    };
    global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.lifeDesigner = {};
    global.lifeManager = new EffectableEntity({ description: 'life' });
    global.oreScanner = {};

    const tf = new Terraforming(global.resources, { distanceFromSun:1, radius:1, gravity:1, albedo:0 });
    tf.temperature = { value: 473.15 };
    tf.calculateColonyEnergyPenalty = () => 1;
    tf.calculateMaintenancePenalty = () => 2;
    tf.calculateSolarPanelMultiplier = () => 1;
    tf.calculateWindTurbineMultiplier = () => 1;

    const originalAdd = global.addEffect;
    const mockAdd = jest.fn();
    global.addEffect = mockAdd;

    expect(getFactoryTemperatureMaintenancePenaltyReduction()).toBeCloseTo(0.25);
    expect(tf.getFactoryTemperatureMaintenancePenaltyReduction()).toBeCloseTo(0.25);

    tf.applyTerraformingEffects();

    const buildingPenalty = mockAdd.mock.calls
      .map(c => c[0])
      .find(e => e.target === 'building' && e.targetId === 'factory' && e.effectId === 'temperatureMaintenancePenalty');
    expect(buildingPenalty).toBeDefined();
    expect(buildingPenalty.value).toBeCloseTo(1.75);

    global.addEffect = originalAdd;
  });
});
