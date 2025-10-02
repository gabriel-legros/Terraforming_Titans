const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { dysonReceiver: DysonReceiver } = require('../src/js/buildings/dysonReceiver.js');

function createReceiver() {
  const config = {
    name: 'Dyson Receiver',
    category: 'energy',
    cost: {},
    consumption: {},
    production: { colony: { energy: 100 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new DysonReceiver(config, 'dysonReceiver');
}

describe('Dyson Receiver productivity cap', () => {
  beforeEach(() => {
    global.resources = { colony: { energy: { value: 0, modifyRate: () => {} } } };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
  });

  test('caps productivity to available swarm energy', () => {
    const building = createReceiver();
    building.active = 1;
    global.projectManager = {
      projects: {
        dysonSwarmReceiver: {
          isCompleted: true,
          collectors: 1,
          energyPerCollector: 50
        }
      }
    };
    building.updateProductivity(global.resources, 1000);
    expect(building.productivity).toBeCloseTo(0.5);
  });

  test('no swarm energy disables productivity', () => {
    const building = createReceiver();
    building.active = 1;
    global.projectManager = {
      projects: {
        dysonSwarmReceiver: {
          isCompleted: false,
          collectors: 0,
          energyPerCollector: 50
        }
      }
    };
    building.updateProductivity(global.resources, 1000);
    expect(building.productivity).toBe(0);
  });
});
