const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { initializeBuildings, Building } = require('../src/js/building.js');
global.Building = Building;
global.initializeBuildingTabs = () => {};

const { AntimatterBattery } = require('../src/js/buildings/AntimatterBattery.js');
global.AntimatterBattery = AntimatterBattery;
const { Resource } = require('../src/js/resource.js');
const {
  ANTIMATTER_PER_TERRAFORMED_WORLD,
} = require('../src/js/special/antimatter.js');
const ENERGY_PER_ANTIMATTER = 2_000_000_000_000_000;

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

      expect(buildings.antimatterBattery).toBeInstanceOf(AntimatterBattery);
      expect(global.resources.colony.energy.updateStorageCap).toHaveBeenCalled();
    } finally {
      global.resources = previousResources;
      global.buildings = previousBuildings;
      global.maintenanceFraction = previousMaintenanceFraction;
    }
  });

  describe('custom UI and fill action', () => {
    let dom;
    let battery;

    beforeEach(() => {
      dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
      global.window = dom.window;
      global.document = dom.window.document;

      global.resources = {
        colony: {
          energy: new Resource({
            name: 'energy',
            category: 'colony',
            hasCap: true,
            baseCap: 0,
            unlocked: true,
          }),
        },
        special: {
          antimatter: new Resource({
            name: 'antimatter',
            category: 'special',
            hasCap: true,
            baseCap: 0,
            unlocked: true,
          }),
        },
      };

      global.resources.colony.energy.value = 0;
      global.resources.special.antimatter.value = 200;

      global.structures = {};
      global.buildings = {};
      global.maintenanceFraction = 1;
      global.unlockResource = () => {};
      global.spaceManager = {
        getTerraformedPlanetCount: () => 2,
      };

      const config = {
        name: 'Antimatter Battery',
        category: 'storage',
        description: '',
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
        unlocked: true,
      };

      battery = new AntimatterBattery(config, 'antimatterBattery');
      global.structures.antimatterBattery = battery;
      global.buildings.antimatterBattery = battery;
      battery.count = 1;
      battery.active = 1;
      global.resources.colony.energy.updateStorageCap();
    });

    afterEach(() => {
      dom.window.close();
      delete global.window;
      delete global.document;
      delete global.resources;
      delete global.structures;
      delete global.buildings;
      delete global.maintenanceFraction;
      delete global.unlockResource;
      delete global.spaceManager;
    });

    test('initializeCustomUI wires fill button and updates disabled state', () => {
      const leftContainer = global.document.createElement('div');
      const hideButton = global.document.createElement('button');
      leftContainer.appendChild(hideButton);
      const cachedElements = {};

      battery.initializeCustomUI({ leftContainer, hideButton, cachedElements });

      const fillButton = cachedElements.fillButton;
      expect(fillButton).toBeDefined();
      expect(hideButton.nextSibling).toBe(fillButton);

      battery.updateUI(cachedElements);
      expect(fillButton.disabled).toBe(false);

      global.resources.special.antimatter.value = 0;
      battery.updateUI(cachedElements);
      expect(fillButton.disabled).toBe(true);
    });

    test('fillFromAntimatter consumes antimatter and adds stored energy', () => {
      const energyBefore = global.resources.colony.energy.value;
      const antimatterBefore = global.resources.special.antimatter.value;

      battery.fillFromAntimatter();

      const expectedRate = 2 * ANTIMATTER_PER_TERRAFORMED_WORLD;
      const expectedEnergyGain = Math.min(
        global.resources.colony.energy.cap - energyBefore,
        expectedRate * ENERGY_PER_ANTIMATTER,
        antimatterBefore * ENERGY_PER_ANTIMATTER,
      );

      expect(global.resources.colony.energy.value).toBeCloseTo(energyBefore + expectedEnergyGain);
      const expectedAntimatter = antimatterBefore - expectedEnergyGain / ENERGY_PER_ANTIMATTER;
      expect(global.resources.special.antimatter.value).toBeCloseTo(expectedAntimatter);
    });
  });
});
