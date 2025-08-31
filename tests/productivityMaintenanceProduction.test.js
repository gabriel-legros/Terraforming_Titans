const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource, produceResources } = require('../src/js/resource.js');
const { Building } = require('../src/js/building.js');

describe('productivity includes maintenance production', () => {
  beforeEach(() => {
    global.resources = {
      colony: {
        metal: new Resource({ name: 'metal', category: 'colony', initialValue: 1000, maintenanceConversion: { surface: 'scrapMetal' } })
      },
      surface: {
        scrapMetal: new Resource({ name: 'scrapMetal', category: 'surface', initialValue: 0 })
      },
      underground: {},
      atmospheric: {}
    };
    global.structures = {};
    global.dayNightCycle = { isDay: () => true };
    global.fundingModule = null;
    global.terraforming = { updateResources: () => {}, distributeGlobalChangesToZones: () => {} };
    global.lifeManager = null;
    global.researchManager = null;
    global.lifeDesigner = {};
    global.updateShipReplication = null;
    global.updateAndroidResearch = null;
    global.globalEffects = new EffectableEntity({ description: 'global' });
    global.projectManager = { projects: {} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.oreScanner = {};
    global.maintenanceFraction = 0.1;
  });

  test('maintenance conversion contributes to productivity', () => {
    const maintProducer = new Building({
      name: 'MaintProd',
      category: 'test',
      cost: { colony: { metal: 100 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: false,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true
    }, 'maintProducer');
    maintProducer.count = 1;
    maintProducer.active = 1;

    const consumer = new Building({
      name: 'Consumer',
      category: 'test',
      cost: {},
      consumption: { surface: { scrapMetal: 5 } },
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: false,
      requiresMaintenance: false,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true
    }, 'consumer');
    consumer.count = 1;
    consumer.active = 1;

    const buildings = { maintProducer, consumer };
    produceResources(1000, buildings);
    expect(consumer.productivity).toBeCloseTo(0.1);
  });
});
