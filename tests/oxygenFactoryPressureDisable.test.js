const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

global.oxygenFactorySettings = { autoDisableAbovePressure: false, disablePressureThreshold: 15, restartCap: 1, restartTimer: 0 };
global.calculateAtmosphericPressure = (amount) => amount; // simple stub returning Pa equal to amount

const researchedManagerStub = {
  getResearchById: () => ({ isResearched: true })
};

function createFactory() {
  const config = {
    name: 'Oxygen factory',
    category: 'terraforming',
    cost: {},
    consumption: {},
    production: {},
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new Building(config, 'oxygenFactory');
}

describe('Oxygen factory pressure disabling', () => {
  beforeEach(() => {
    global.resources = { colony:{}, atmospheric:{ oxygen: { value: 0 }}, surface:{}, underground:{} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.terraforming = { celestialParameters: { gravity: 1, radius: 1 } };
    oxygenFactorySettings.autoDisableAbovePressure = false;
    oxygenFactorySettings.disablePressureThreshold = 15;
    oxygenFactorySettings.restartCap = 1;
    oxygenFactorySettings.restartTimer = 0;
    global.researchManager = researchedManagerStub;
  });

  test('disables production above threshold', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    resources.atmospheric.oxygen.value = 16000; // Pa
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBe(0);
  });

  test('produces when below threshold', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    resources.atmospheric.oxygen.value = 14000; // Pa
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  test('gradual reactivation after high pressure shutdown', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    resources.atmospheric.oxygen.value = 16000;
    fac.updateProductivity(global.resources, 1000);
    expect(oxygenFactorySettings.restartCap).toBe(0);

    resources.atmospheric.oxygen.value = 14000;
    fac.updateProductivity(global.resources, 1000);
    expect(oxygenFactorySettings.restartCap).toBeCloseTo(0.26, 2);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  test('does not disable without research', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    oxygenFactorySettings.autoDisableAbovePressure = true;
    resources.atmospheric.oxygen.value = 16000;
    global.researchManager = { getResearchById: () => ({ isResearched: false }) };
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  afterEach(() => {
    delete global.researchManager;
  });
});
