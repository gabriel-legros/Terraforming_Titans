const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { initializeBuildings, Building } = require('../src/js/building.js');
global.Building = Building;
global.initializeBuildingTabs = () => {};

describe('Antimatter Battery building', () => {
  test('parameters store a quadrillion energy and are locked by default', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);

    const antimatterBattery = ctx.buildingsParameters.antimatterBattery;

    expect(antimatterBattery).toBeDefined();
    expect(antimatterBattery.unlocked).toBe(false);
    expect(antimatterBattery.cost.colony).toEqual({ metal: 1000, superconductors: 100 });
    expect(antimatterBattery.storage.colony.energy).toBe(1_000_000_000_000_000);
  });

  test('initializeBuildings creates a standard Building for the Antimatter Battery', () => {
    const previousResources = global.resources;
    const previousBuildings = global.buildings;
    const previousMaintenanceFraction = global.maintenanceFraction;

    global.resources = {
      colony: {
        energy: {
          updateStorageCap: jest.fn()
        }
      }
    };
    global.buildings = {};
    global.maintenanceFraction = 1;

    try {
      const params = {
        antimatterBattery: {
          name: 'Antimatter Battery',
          category: 'storage',
          description: 'Stores staggering amounts of energy by containing antimatter safely.',
          cost: { colony: { metal: 1000, superconductors: 100 } },
          consumption: {},
          production: {},
          storage: { colony: { energy: 1_000_000_000_000_000 } },
          dayNightActivity: false,
          canBeToggled: true,
          requiresMaintenance: true,
          requiresProductivity: false,
          requiresWorker: 0,
          maintenanceFactor: 2,
          unlocked: false
        }
      };

      const buildings = initializeBuildings(params);

      expect(buildings.antimatterBattery).toBeInstanceOf(Building);
      expect(global.resources.colony.energy.updateStorageCap).toHaveBeenCalled();
    } finally {
      global.resources = previousResources;
      global.buildings = previousBuildings;
      global.maintenanceFraction = previousMaintenanceFraction;
    }
  });
});
