const { planetParameters } = require('../src/js/planet-parameters.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

describe('resource maintenanceMultiplier', () => {
  test('superalloys have maintenanceMultiplier 0', () => {
    expect(planetParameters.mars.resources.colony.superalloys.maintenanceMultiplier).toBe(0);
  });

  test('building maintenance cost scaled by resource maintenanceMultiplier', () => {
    global.buildings = {};
    global.colonies = {};
    global.projectManager = { projects: {} };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.terraforming = {};
    global.lifeDesigner = {};
    global.lifeManager = {};
    global.oreScanner = {};
    global.globalEffects = new EffectableEntity({ description: 'global' });
    global.dayNightCycle = { isDay: () => true };
    global.maintenanceFraction = 0.1;
    global.resources = {
      colony: {
        metal: { updateStorageCap: () => {} },
        superalloys: { maintenanceMultiplier: 0, updateStorageCap: () => {} }
      }
    };

    const config = {
      name: 'Test',
      category: 'test',
      cost: { colony: { metal: 100, superalloys: 50 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: false,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true
    };

    const building = new Building(config, 'b1');
    expect(building.maintenanceCost.metal).toBeCloseTo(10); // 100 * 0.1
    expect(building.maintenanceCost.superalloys).toBe(0);
  });
});
