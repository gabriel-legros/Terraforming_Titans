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

describe('Dyson Receiver build cap', () => {
  const originalResources = global.resources;
  const originalBuildings = global.buildings;
  const originalProjectManager = global.projectManager;
  const originalMaintenanceFraction = global.maintenanceFraction;
  const originalDayNightCycle = global.dayNightCycle;

  beforeEach(() => {
    global.resources = {
      colony: {},
      surface: { land: { value: 0, reserved: 0, reserve() {}, release() {} } },
      underground: {}
    };
    global.buildings = {};
    global.projectManager = {
      projects: {
        dysonSwarmReceiver: {
          isCompleted: true,
          collectors: 0,
          energyPerCollector: 100
        }
      }
    };
    global.maintenanceFraction = 0;
    global.dayNightCycle = { isDay: () => true };
  });

  afterEach(() => {
    global.projectManager = originalProjectManager;
    global.resources = originalResources;
    global.buildings = originalBuildings;
    global.maintenanceFraction = originalMaintenanceFraction;
    global.dayNightCycle = originalDayNightCycle;
  });

  test('cannot build receivers without sufficient swarm capacity', () => {
    const building = createReceiver();
    expect(building.build(1)).toBe(false);

    global.projectManager.projects.dysonSwarmReceiver.collectors = 1;
    expect(building.build(1)).toBe(true);
    expect(building.count).toBe(1);

    global.projectManager.projects.dysonSwarmReceiver.collectors = 1;
    expect(building.build(1)).toBe(false);
  });

  test('caps bulk construction requests to remaining capacity', () => {
    const building = createReceiver();
    global.projectManager.projects.dysonSwarmReceiver.collectors = 5;

    expect(building.build(10)).toBe(true);
    expect(building.count).toBe(5);

    expect(building.build(10)).toBe(false);

    global.projectManager.projects.dysonSwarmReceiver.collectors = 10;
    expect(building.build(10)).toBe(true);
    expect(building.count).toBe(10);
  });
});
