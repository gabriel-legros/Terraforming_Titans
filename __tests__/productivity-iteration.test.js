const EffectableEntity = require('../src/js/effectable-entity');

global.EffectableEntity = EffectableEntity;

const { Building } = require('../src/js/building');
const { Resource, produceResources } = require('../src/js/resource');

describe('productivity iteration', () => {
  beforeEach(() => {
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.dayNightCycle = { isDay: () => true };
    global.terraforming = null;
    global.fundingModule = null;
    global.lifeManager = null;
    global.researchManager = null;
    global.projectManager = null;
    global.nanotechManager = undefined;
    global.spaceManager = null;
    global.globalEffects = {};
  });

  afterEach(() => {
    global.resources = {};
    global.buildings = {};
    global.structures = {};
    global.populationModule = null;
    global.dayNightCycle = null;
    global.terraforming = null;
    global.fundingModule = null;
    global.lifeManager = null;
    global.researchManager = null;
    global.projectManager = null;
    global.nanotechManager = undefined;
    global.spaceManager = null;
    global.globalEffects = null;
  });

  test('propagates shortages through chained production', () => {
    const ore = new Resource({ name: 'ore', category: 'colony', initialValue: 0 });
    const metal = new Resource({ name: 'metal', category: 'colony', initialValue: 0 });
    const parts = new Resource({ name: 'parts', category: 'colony', initialValue: 0 });

    global.resources = { colony: { ore, metal, parts } };

    const smelter = new Building({
      name: 'Ore Smelter',
      category: 'colony',
      description: '',
      cost: {},
      consumption: { colony: { ore: 10 } },
      production: { colony: { metal: 10 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true,
      snapProductivity: true,
    }, 'smelter');

    const press = new Building({
      name: 'Metal Press',
      category: 'colony',
      description: '',
      cost: {},
      consumption: { colony: { metal: 10 } },
      production: { colony: { parts: 10 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true,
      snapProductivity: true,
    }, 'press');

    smelter.active = 1;
    press.active = 1;

    const buildings = { smelter, press };
    global.buildings = buildings;
    global.structures = buildings;

    produceResources(1000, buildings);

    expect(smelter.productivity).toBe(0);
    expect(press.productivity).toBe(0);
  });

  test('uses target productivity when iterating production rates', () => {
    const ore = new Resource({ name: 'ore', category: 'colony', initialValue: 0 });
    const metal = new Resource({ name: 'metal', category: 'colony', initialValue: 0 });

    global.resources = { colony: { ore, metal } };

    const mine = new Building({
      name: 'Ore Mine',
      category: 'colony',
      description: '',
      cost: {},
      consumption: {},
      production: { colony: { ore: 10 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true,
    }, 'mine');

    const smelter = new Building({
      name: 'Ore Smelter',
      category: 'colony',
      description: '',
      cost: {},
      consumption: { colony: { ore: 10 } },
      production: { colony: { metal: 10 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true,
    }, 'smelter');

    mine.active = 1;
    smelter.active = 1;

    const buildings = { mine, smelter };
    global.buildings = buildings;
    global.structures = buildings;

    produceResources(1000, buildings);

    expect(smelter.productivity).toBeGreaterThan(0);
  });
});
