const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

const { Resource } = require('../src/js/resource.js');
const { Building } = require('../src/js/building.js');
global.Building = Building;

const { WaterTank } = require('../src/js/buildings/WaterTank.js');
const { getZonePercentage, ZONES } = require('../src/js/terraforming/zones.js');

global.getZonePercentage = getZonePercentage;
global.ZONES = ZONES;

describe('WaterTank', () => {
  let dom;
  let tank;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    global.window = dom.window;
    global.document = dom.window.document;

    global.resources = {
      colony: {
        water: new Resource({ name: 'water', category: 'colony', hasCap: true, baseCap: 0, unlocked: true })
      },
      surface: {
        liquidWater: new Resource({ name: 'liquidWater', category: 'surface', hasCap: false, baseCap: 0, unlocked: true })
      }
    };

    global.resources.colony.water.value = 200;
    global.resources.surface.liquidWater.value = 0;

    global.terraforming = {
      zonalWater: {
        tropical: { liquid: 0, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: 0, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 }
      }
    };

    global.structures = {};
    global.buildings = {};
    global.maintenanceFraction = 0.001;
    global.unlockResource = () => {};

    const config = {
      name: 'Water Tank',
      category: 'storage',
      description: '',
      cost: { colony: { metal: 100 } },
      consumption: {},
      production: {},
      storage: { colony: { water: 5000 } },
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: true,
      requiresProductivity: false,
      requiresWorker: 0,
      maintenanceFactor: 0.05,
      unlocked: true
    };

    tank = new WaterTank(config, 'waterTank');
    global.structures.waterTank = tank;
    global.buildings.waterTank = tank;
  });

  afterEach(() => {
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.resources;
    delete global.structures;
    delete global.buildings;
    delete global.terraforming;
    delete global.maintenanceFraction;
    delete global.unlockResource;
  });

  test('emptyToSurface transfers stored water to surface reservoirs and zonal pools', () => {
    global.resources.colony.water.value = 300;
    tank.emptyToSurface();

    expect(global.resources.colony.water.value).toBe(0);
    expect(global.resources.surface.liquidWater.value).toBeCloseTo(300);

    const totalLiquid = Object.values(global.terraforming.zonalWater)
      .reduce((sum, zone) => sum + (zone.liquid || 0), 0);
    expect(totalLiquid).toBeCloseTo(300);
  });

  test('initializeCustomUI creates empty button that empties tanks when pressed', () => {
    const leftContainer = global.document.createElement('div');
    const hideButton = global.document.createElement('button');
    leftContainer.appendChild(hideButton);
    const cachedElements = {};

    tank.initializeCustomUI({ leftContainer, hideButton, cachedElements });

    const emptyButton = cachedElements.emptyButton;
    expect(emptyButton).toBeDefined();
    expect(hideButton.nextSibling).toBe(emptyButton);

    global.resources.colony.water.value = 0;
    tank.updateUI(cachedElements);
    expect(emptyButton.disabled).toBe(true);

    global.resources.colony.water.value = 40;
    tank.updateUI(cachedElements);
    expect(emptyButton.disabled).toBe(false);

    emptyButton.click();
    expect(global.resources.colony.water.value).toBe(0);
    expect(global.resources.surface.liquidWater.value).toBeCloseTo(40);
  });
});
