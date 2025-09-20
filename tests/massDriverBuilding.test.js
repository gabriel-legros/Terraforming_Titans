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
  test('Mass Driver costs 10x an oxygen factory and is locked by default', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    const massDriver = ctx.buildingsParameters.massDriver;
    const oxygenFactory = ctx.buildingsParameters.oxygenFactory;

    expect(massDriver).toBeDefined();
    expect(oxygenFactory).toBeDefined();
    expect(massDriver.unlocked).toBe(false);

    const expectedCost = {};
    for (const [resource, amount] of Object.entries(oxygenFactory.cost.colony)) {
      expectedCost[resource] = amount * 10;
    }
    expect(massDriver.cost.colony).toEqual(expectedCost);
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
});
