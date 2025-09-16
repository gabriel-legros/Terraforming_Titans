const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;

const OriginalColony = global.Colony;
const originalResources = global.resources;
const originalBuildings = global.buildings;
const originalTerraforming = global.terraforming;

class TestColony extends Building {
  constructor(config, name) {
    super(config, name);
  }
}

global.Colony = TestColony;

const { Aerostat } = require('../src/js/buildings/aerostat.js');

describe('Aerostat build cap', () => {
  let baseConfig;
  const originalMaintenanceFraction = global.maintenanceFraction;
  const originalDayNightCycle = global.dayNightCycle;

  beforeEach(() => {
    baseConfig = {
      name: 'Aerostat Colony',
      category: 'Colony',
      cost: {},
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresDeposit: false,
      requiresWorker: 0,
      unlocked: true,
      requiresLand: 0
    };

    global.maintenanceFraction = 0;
    global.dayNightCycle = { isDay: () => true };
    global.resources = {
      colony: {},
      surface: {
        land: {
          value: 0,
          reserved: 0,
          reserve(amount) {
            this.reserved += amount;
          },
          release(amount) {
            this.reserved -= amount;
          }
        }
      },
      underground: {}
    };
    global.buildings = {};
    global.terraforming = { initialLand: 100 };
  });

  afterEach(() => {
    global.maintenanceFraction = originalMaintenanceFraction;
    global.dayNightCycle = originalDayNightCycle;
  });

  afterAll(() => {
    global.Colony = OriginalColony;
    global.resources = originalResources;
    global.buildings = originalBuildings;
    global.terraforming = originalTerraforming;
  });

  test('build enforces 0.2 per initial land cap', () => {
    const aerostat = new Aerostat(baseConfig, 'aerostat_colony');
    expect(aerostat.build(30)).toBe(true);
    expect(aerostat.count).toBe(20);
    expect(aerostat.build(1)).toBe(false);
    expect(aerostat.count).toBe(20);
  });

  test('maxBuildable respects resource limits and cap', () => {
    global.resources.colony.metal = {
      value: 15,
      cap: 15,
      reserved: 0,
      decrease(amount) {
        this.value -= amount;
      }
    };

    const configWithCost = {
      ...baseConfig,
      cost: { colony: { metal: 1 } }
    };

    const aerostat = new Aerostat(configWithCost, 'aerostat_colony');
    expect(aerostat.maxBuildable()).toBe(15);
    aerostat.count = 12;
    expect(aerostat.maxBuildable()).toBe(8);
    aerostat.count = 20;
    expect(aerostat.maxBuildable()).toBe(0);
  });
});
