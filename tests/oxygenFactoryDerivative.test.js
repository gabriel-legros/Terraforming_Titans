const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { oxygenFactorySettings } = require('../src/js/ghg-automation.js');
const { OxygenFactory } = require('../src/js/buildings/OxygenFactory.js');

describe('Oxygen factory pressure derivative', () => {
  beforeEach(() => {
    global.resources = { colony: {}, atmospheric: { oxygen: { value: 0 } }, surface: {}, underground: {} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.terraforming = { celestialParameters: { gravity: 1, radius: 1 } };
    global.researchManager = { getResearchById: () => ({ isResearched: true }) };
    oxygenFactorySettings.autoDisableAbovePressure = true;
    oxygenFactorySettings.disablePressureThreshold = 1;
  });

  afterEach(() => {
    delete global.researchManager;
    delete global.populationModule;
    delete global.calculateAtmosphericPressure;
    delete global.terraforming;
    delete global.resources;
  });

  test('calculateAtmosphericPressure never receives negative values', () => {
    const called = [];
    global.calculateAtmosphericPressure = (amount) => {
      called.push(amount);
      return amount;
    };

    const config = {
      name: 'Oxygen factory',
      category: 'terraforming',
      cost: {},
      consumption: {},
      production: { atmospheric: { oxygen: 10 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
    };

    const building = new OxygenFactory(config, 'oxygenFactory');
    building.active = 1;
    building.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });

    building.updateProductivity(global.resources, 1000);

    expect(called.length).toBeGreaterThan(0);
    expect(called.every(v => v >= 0)).toBe(true);
  });
});

