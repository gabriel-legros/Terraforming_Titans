const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

global.ghgFactorySettings = { autoDisableAboveTemp: false, disableTempThreshold: 283.15, restartCap: 1, restartTimer: 0 };

function createFactory() {
  const config = {
    name: 'Greenhouse Gas factory',
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
  return new Building(config, 'ghgFactory');
}

describe('GHG factory temperature disabling', () => {
  beforeEach(() => {
    global.resources = { colony:{}, atmospheric:{}, surface:{}, underground:{} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.terraforming = { temperature: { value: 0 } };
    ghgFactorySettings.autoDisableAboveTemp = false;
    ghgFactorySettings.disableTempThreshold = 283.15;
  });

  test('disables production above threshold', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 280;
    terraforming.temperature.value = 285;
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
    fac.updateProductivity(global.resources, 1000);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  test('gradual reactivation after high temp shutdown', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 280;
    terraforming.temperature.value = 285;
    fac.updateProductivity(global.resources, 1000);
    expect(ghgFactorySettings.restartCap).toBe(0);

    terraforming.temperature.value = 275;
    for(let i=0;i<5;i++){
      fac.updateProductivity(global.resources, 1000);
    }
    expect(ghgFactorySettings.restartCap).toBeCloseTo(0.27, 2);
    expect(fac.productivity).toBeGreaterThan(0);
  });
});
