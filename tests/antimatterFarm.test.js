const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { initializeBuildings, Building } = require('../src/js/building.js');
global.Building = Building;
global.initializeBuildingTabs = () => {};

describe('Antimatter Farm integrations', () => {
  test('default planet parameters include a locked antimatter resource', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'planet-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.defaultPlanetParameters = defaultPlanetParameters;', ctx);

    const antimatter = ctx.defaultPlanetParameters.resources.special.antimatter;

    expect(antimatter).toBeDefined();
    expect(antimatter.unlocked).toBe(false);
    expect(antimatter.hasCap).toBe(false);
    expect(antimatter.initialValue).toBe(0);
  });

  test('antimatter farm parameters consume energy and produce antimatter', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);

    const antimatterFarm = ctx.buildingsParameters.antimatterFarm;

    expect(antimatterFarm).toBeDefined();
    expect(antimatterFarm.unlocked).toBe(false);
    expect(antimatterFarm.category).toBe('energy');
    expect(antimatterFarm.cost.colony).toEqual({
      metal: 10000,
      components: 1000,
      superconductors: 1000,
      electronics: 100
    });
    expect(antimatterFarm.consumption.colony.energy).toBe(2_000_000_000_000_000);
    expect(antimatterFarm.production.special.antimatter).toBe(1);
  });

  test('initializeBuildings returns a Building instance for the antimatter farm', () => {
    const previousResources = global.resources;
    const previousBuildings = global.buildings;
    const previousMaintenanceFraction = global.maintenanceFraction;

    global.resources = { colony: {}, special: {} };
    global.buildings = {};
    global.maintenanceFraction = 1;

    try {
      const params = {
        antimatterFarm: {
          name: 'Antimatter Farm',
          category: 'energy',
          description: '',
          cost: { colony: { metal: 1 } },
          consumption: { colony: { energy: 1 } },
          production: { special: { antimatter: 1 } },
          storage: {},
          dayNightActivity: false,
          canBeToggled: true,
          requiresMaintenance: true,
          requiresProductivity: false,
          requiresWorker: 0,
          maintenanceFactor: 1,
          unlocked: false
        }
      };

      const buildings = initializeBuildings(params);
      expect(buildings.antimatterFarm).toBeInstanceOf(Building);
    } finally {
      global.resources = previousResources;
      global.buildings = previousBuildings;
      global.maintenanceFraction = previousMaintenanceFraction;
    }
  });
});
