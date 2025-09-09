const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { oxygenFactorySettings } = require('../src/js/ghg-automation.js');
const { OxygenFactory } = require('../src/js/buildings/OxygenFactory.js');
global.calculateAtmosphericPressure = (amount) => amount * 1000; // 1 unit => 1 kPa

const researchedManagerStub = {
  getResearchById: () => ({ isResearched: true })
};

function createFactory() {
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
    unlocked: true
  };
  return new OxygenFactory(config, 'oxygenFactory');
}

describe('Oxygen factory pressure disabling', () => {
  beforeEach(() => {
    global.resources = { colony:{}, atmospheric:{ oxygen: { value: 0 }}, surface:{}, underground:{} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.terraforming = { celestialParameters: { gravity: 1, radius: 1 } };
    oxygenFactorySettings.autoDisableAbovePressure = false;
    oxygenFactorySettings.disablePressureThreshold = 15;
    global.researchManager = researchedManagerStub;
  });

  test('disables production above threshold', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    resources.atmospheric.oxygen.value = 16; // kPa
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBe(0);
  });

  test('produces when below threshold', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    resources.atmospheric.oxygen.value = 14; // kPa
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  test('produces only the amount needed to reach target pressure', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    oxygenFactorySettings.disablePressureThreshold = 5;
    resources.atmospheric.oxygen.value = 0; // kPa
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeCloseTo(0.5, 3);
  });

  test('clamps productivity to minRatio', () => {
    const fac = createFactory();
    fac.requiresWorker = 100;
    global.populationModule = { getWorkerAvailabilityRatio: () => 0.2 };
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    oxygenFactorySettings.disablePressureThreshold = 5;
    resources.atmospheric.oxygen.value = 0;
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeCloseTo(0.2, 3);
  });

  test('does not disable without research', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    resources.atmospheric.oxygen.value = 16; // kPa
    global.researchManager = { getResearchById: () => ({ isResearched: false }) };
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  afterEach(() => {
    delete global.researchManager;
  });
});

