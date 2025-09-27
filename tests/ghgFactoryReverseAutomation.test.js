const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { GhgFactory, ghgFactorySettings } = require('../src/js/buildings/GhgFactory.js');

function createFactory(){
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
    unlocked: true,
    reversalAvailable: true,
    defaultRecipe: 'ghg',
    recipes: {
      ghg: { production: { atmospheric: { greenhouseGas: 10 } }, reverseTarget: { category: 'atmospheric', resource: 'greenhouseGas' } },
      calcite: { production: { atmospheric: { calciteAerosol: 10 } }, reverseTarget: { category: 'atmospheric', resource: 'calciteAerosol' } }
    }
  };
  return new GhgFactory(config, 'ghgFactory');
}

describe('GHG factory reverse automation', () => {
  beforeEach(() => {
    global.resources = { colony:{}, atmospheric:{}, surface:{}, underground:{} };
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.terraforming = { temperature: { value: 0 } };
    global.researchManager = { getResearchById: () => ({ isResearched: true }) };
    ghgFactorySettings.autoDisableAboveTemp = true;
    ghgFactorySettings.disableTempThreshold = 5;
    ghgFactorySettings.reverseTempThreshold = 10;
  });

  test('runs forward below A and reverse above B for greenhouse gas', () => {
    const fac = createFactory();
    fac.active = 1;
    fac.setAutoReverse(true);
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    resources.atmospheric.greenhouseGas = { value: 20 };
    let baseTemp = 0;
    terraforming.updateSurfaceTemperature = () => {
      terraforming.temperature.value = baseTemp + resources.atmospheric.greenhouseGas.value;
    };

    baseTemp = 3 - resources.atmospheric.greenhouseGas.value;
    terraforming.temperature.value = 3; // below A
    fac.updateProductivity(resources, 1000);
    expect(fac.reverseEnabled).toBe(false);
    expect(fac.productivity).toBeGreaterThan(0);

    baseTemp = 12 - resources.atmospheric.greenhouseGas.value;
    terraforming.temperature.value = 12; // above B
    fac.updateProductivity(resources, 1000);
    expect(fac.reverseEnabled).toBe(true);
    expect(fac.productivity).toBeGreaterThan(0);
  });

  test('calcite recipe reverses below A and produces above B', () => {
    const fac = createFactory();
    fac._toggleRecipe(); // switch to calcite
    fac.active = 1;
    fac.setAutoReverse(true);
    fac.addEffect({ type: 'booleanFlag', flagId: 'terraformingBureauFeature', value: true });
    resources.atmospheric.calciteAerosol = { value: 20 };
    let baseTemp = 0;
    terraforming.updateSurfaceTemperature = () => {
      terraforming.temperature.value = baseTemp - (resources.atmospheric.calciteAerosol.value || 0);
    };

    baseTemp = 12 + (resources.atmospheric.calciteAerosol.value || 0);
    terraforming.temperature.value = 12; // above B -> produce
    fac.updateProductivity(resources, 1000);
    expect(fac.reverseEnabled).toBe(false);
    expect(fac.productivity).toBeGreaterThan(0);

    baseTemp = 3 + (resources.atmospheric.calciteAerosol.value || 0);
    terraforming.temperature.value = 3; // below A -> reverse
    fac.updateProductivity(resources, 1000);
    expect(fac.reverseEnabled).toBe(true);
    expect(fac.productivity).toBeGreaterThan(0);
  });
  afterEach(() => {
    delete global.researchManager;
  });
});
