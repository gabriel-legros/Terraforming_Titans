const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;

const OriginalColony = global.Colony;
const originalResources = global.resources;
const originalBuildings = global.buildings;
const originalTerraforming = global.terraforming;
const originalCalculateMolecularWeight = global.calculateMolecularWeight;
const originalCalculateSpecificLift = global.calculateSpecificLift;
const originalMinimumLift = global.AEROSTAT_MINIMUM_OPERATIONAL_LIFT;

let currentLift = 0.3;

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
      atmospheric: {},
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
    global.terraforming = { initialLand: 100, resources: { atmospheric: {} } };
    currentLift = 0.5;
    global.calculateMolecularWeight = jest.fn(() => 44);
    global.calculateSpecificLift = jest.fn(() => currentLift);
    global.AEROSTAT_MINIMUM_OPERATIONAL_LIFT = 0.2;
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
    if (typeof originalCalculateMolecularWeight === 'undefined') {
      delete global.calculateMolecularWeight;
    } else {
      global.calculateMolecularWeight = originalCalculateMolecularWeight;
    }
    if (typeof originalCalculateSpecificLift === 'undefined') {
      delete global.calculateSpecificLift;
    } else {
      global.calculateSpecificLift = originalCalculateSpecificLift;
    }
    if (typeof originalMinimumLift === 'undefined') {
      delete global.AEROSTAT_MINIMUM_OPERATIONAL_LIFT;
    } else {
      global.AEROSTAT_MINIMUM_OPERATIONAL_LIFT = originalMinimumLift;
    }
  });

  test('build enforces 0.25 per initial land cap', () => {
    const aerostat = new Aerostat(baseConfig, 'aerostat_colony');
    expect(aerostat.build(30)).toBe(true);
    expect(aerostat.count).toBe(25);
    expect(aerostat.build(1)).toBe(false);
    expect(aerostat.count).toBe(25);
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
    expect(aerostat.maxBuildable()).toBe(13);
    aerostat.count = 20;
    expect(aerostat.maxBuildable()).toBe(5);
  });

  test('build fails when atmospheric lift is below the operational threshold', () => {
    currentLift = 0.05;
    const aerostat = new Aerostat(baseConfig, 'aerostat_colony');
    expect(aerostat.build(1)).toBe(false);
    expect(aerostat.count).toBe(0);
  });

  test('maxBuildable returns zero when lift cannot support aerostat colonies', () => {
    currentLift = 0.05;
    const aerostat = new Aerostat(baseConfig, 'aerostat_colony');
    expect(aerostat.maxBuildable()).toBe(0);
  });

  test('buoyancy summary warns about insufficient lift preventing construction', () => {
    currentLift = 0.05;
    const aerostat = new Aerostat(baseConfig, 'aerostat_colony');
    expect(aerostat.getBuoyancySummary()).toContain(
      'preventing aerostat activation and construction'
    );
  });
});
