const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { GhgFactory, ghgFactorySettings } = require('../src/js/buildings/GhgFactory.js');

const researchedManagerStub = {
  getResearchById: () => ({ isResearched: true })
};

function createFactory() {
  const config = {
    name: 'Greenhouse Gas factory',
    category: 'terraforming',
    cost: {},
    consumption: {},
    production: { atmospheric: { greenhouseGas: 10 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new GhgFactory(config, 'ghgFactory');
}

describe('GHG factory temperature disabling', () => {
  beforeEach(() => {
    global.resources = { colony:{}, atmospheric:{}, surface:{}, underground:{} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.terraforming = { temperature: { value: 0, trendValue: 0 } };
    ghgFactorySettings.autoDisableAboveTemp = false;
    ghgFactorySettings.disableTempThreshold = 283.15;
    global.researchManager = researchedManagerStub;
  });

  test('disables production above threshold', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 280;
    terraforming.temperature.value = 285;
    terraforming.temperature.trendValue = 285;
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBe(0);
  });

  test('produces when below threshold', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 285;
    terraforming.temperature.value = 280;
    terraforming.temperature.trendValue = 280;
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  test('produces only the amount needed to reach target temperature', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 5;
    resources.atmospheric.greenhouseGas = { value: 0 };
    terraforming.temperature.value = 0;
    terraforming.temperature.trendValue = 0;
    terraforming.updateSurfaceTemperature = () => {
      const next = resources.atmospheric.greenhouseGas.value;
      terraforming.temperature.value = next;
      terraforming.temperature.trendValue = next;
    };
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeCloseTo(0.5, 3);
  });

  test('clamps productivity to minRatio', () => {
    const fac = createFactory();
    fac.requiresWorker = 100;
    global.populationModule = { getWorkerAvailabilityRatio: () => 0.3 };
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 5;
    resources.atmospheric.greenhouseGas = { value: 0 };
    terraforming.temperature.value = 0;
    terraforming.temperature.trendValue = 0;
    terraforming.updateSurfaceTemperature = () => {
      const next = resources.atmospheric.greenhouseGas.value;
      terraforming.temperature.value = next;
      terraforming.temperature.trendValue = next;
    };
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeCloseTo(0.3, 3);
  });

  test('does not disable without research', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 280;
    terraforming.temperature.value = 285;
    terraforming.temperature.trendValue = 285;
    global.researchManager = { getResearchById: () => ({ isResearched: false }) };
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  test('uses trend temperature for automation thresholds', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 280;
    terraforming.temperature.value = 270;
    terraforming.temperature.trendValue = 285;
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBe(0);
  });

  afterEach(() => {
    delete global.researchManager;
  });
});
