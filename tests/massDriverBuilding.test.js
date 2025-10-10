const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { initializeBuildings, Building } = require('../src/js/building.js');
global.Building = Building;
const { MassDriver } = require('../src/js/buildings/MassDriver.js');
global.initializeBuildingTabs = () => {};

describe('Mass Driver building', () => {
  afterEach(() => {
    delete global.projectManager;
  });

  test('Mass Driver requires superconductors and is locked by default', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    const massDriver = ctx.buildingsParameters.massDriver;
    const oxygenFactory = ctx.buildingsParameters.oxygenFactory;

    expect(massDriver).toBeDefined();
    expect(oxygenFactory).toBeDefined();
    expect(massDriver.unlocked).toBe(false);

    expect(massDriver.cost.colony).toEqual({
      metal: oxygenFactory.cost.colony.metal * 10,
      components: 50,
      superconductors: 50
    });
  });

  test('initializeBuildings uses the MassDriver subclass', () => {
    const params = {
      massDriver: {
        name: 'Mass Driver',
        category: 'terraforming',
        description: '',
        cost: {},
        consumption: {},
        production: {},
        storage: {},
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: true,
        maintenanceFactor: 1,
        requiresDeposit: null,
        requiresWorker: 0,
        unlocked: false
      }
    };

    const buildings = initializeBuildings(params);
    expect(buildings.massDriver).toBeInstanceOf(MassDriver);
  });

  test('Mass Driver productivity stops when Resource Disposal is inactive', () => {
    const config = {
      name: 'Mass Driver',
      category: 'terraforming',
      description: '',
      cost: {},
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: false
    };

    const massDriver = new MassDriver(config, 'massDriver');
    massDriver.active = 1;
    massDriver.productivity = 1;

    global.projectManager = {
      projects: {
        disposeResources: { isActive: false }
      },
      isProjectRelevantToCurrentPlanet: () => true
    };

    const resourcesStub = { colony: {}, atmospheric: {}, surface: {}, underground: {} };

    massDriver.updateProductivity(resourcesStub, 1000);

    expect(massDriver.productivity).toBe(0);
    expect(massDriver.getAutomationActivityMultiplier()).toBe(0);
  });

  test('Mass Driver productivity resumes when Resource Disposal is active', () => {
    const config = {
      name: 'Mass Driver',
      category: 'terraforming',
      description: '',
      cost: {},
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: false
    };

    const massDriver = new MassDriver(config, 'massDriver');
    massDriver.active = 1;
    massDriver.productivity = 0.5;

    global.projectManager = {
      projects: {
        disposeResources: { isActive: true }
      },
      isProjectRelevantToCurrentPlanet: () => true
    };

    const resourcesStub = { colony: {}, atmospheric: {}, surface: {}, underground: {} };

    massDriver.updateProductivity(resourcesStub, 1000);

    expect(massDriver.productivity).toBeGreaterThan(0.5);
    expect(massDriver.getAutomationActivityMultiplier()).toBe(1);
  });
});
