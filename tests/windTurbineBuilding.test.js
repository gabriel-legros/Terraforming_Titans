const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { initializeBuildings, Building } = require('../src/js/building.js');
global.Building = Building;
const { WindTurbine } = require('../src/js/buildings/windTurbine.js');
global.initializeBuildingTabs = () => {};

describe('Wind Turbine Array building', () => {
  let previousResources;
  let previousBuildings;
  let previousMaintenanceFraction;
  let previousTerraforming;
  let previousDayNightCycle;

  const createResource = () => ({
    value: 1_000_000,
    cap: 1_000_000,
    decrease: jest.fn(),
    increase: jest.fn(),
    reserve: jest.fn(),
    release: jest.fn(),
    updateStorageCap: jest.fn()
  });

  beforeEach(() => {
    previousResources = global.resources;
    previousBuildings = global.buildings;
    previousMaintenanceFraction = global.maintenanceFraction;
    previousTerraforming = global.terraforming;
    previousDayNightCycle = global.dayNightCycle;

    const metal = createResource();
    const components = createResource();

    global.resources = {
      colony: {
        metal,
        components,
        energy: { updateStorageCap: jest.fn() }
      },
      surface: {
        land: {
          value: 0,
          reserved: 0,
          reserve: jest.fn(),
          release: jest.fn()
        }
      },
      underground: {}
    };
    global.buildings = {};
    global.maintenanceFraction = 1;
    global.terraforming = { initialLand: 1000 };
    global.dayNightCycle = { isDay: () => true };
  });

  afterEach(() => {
    if (previousResources === undefined) {
      delete global.resources;
    } else {
      global.resources = previousResources;
    }

    if (previousBuildings === undefined) {
      delete global.buildings;
    } else {
      global.buildings = previousBuildings;
    }

    if (previousMaintenanceFraction === undefined) {
      delete global.maintenanceFraction;
    } else {
      global.maintenanceFraction = previousMaintenanceFraction;
    }

    if (previousTerraforming === undefined) {
      delete global.terraforming;
    } else {
      global.terraforming = previousTerraforming;
    }

    if (previousDayNightCycle === undefined) {
      delete global.dayNightCycle;
    } else {
      global.dayNightCycle = previousDayNightCycle;
    }
  });

  test('initializeBuildings uses the WindTurbine subclass', () => {
    const params = {
      windTurbine: {
        name: 'Wind Turbine Array',
        category: 'energy',
        description: 'Harnesses wind to provide steady energy production.',
        cost: { colony: { metal: 25, components: 5 } },
        consumption: {},
        production: { colony: { energy: 400000 } },
        storage: {},
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: true,
        maintenanceFactor: 1,
        requiresWorker: 0,
        unlocked: false
      }
    };

    const buildings = initializeBuildings(params);

    expect(buildings.windTurbine).toBeInstanceOf(WindTurbine);
  });

  test('build enforces the 1 per 50 land cap', () => {
    const params = {
      windTurbine: {
        name: 'Wind Turbine Array',
        category: 'energy',
        description: 'Harnesses wind to provide steady energy production.',
        cost: { colony: { metal: 25, components: 5 } },
        consumption: {},
        production: { colony: { energy: 400000 } },
        storage: {},
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: true,
        maintenanceFactor: 1,
        requiresWorker: 0,
        unlocked: false
      }
    };

    const buildings = initializeBuildings(params);
    const wind = buildings.windTurbine;

    expect(wind.build(25)).toBe(true);
    expect(wind.count).toBe(20);
    expect(wind.build(1)).toBe(false);
    expect(wind.count).toBe(20);
  });
});
