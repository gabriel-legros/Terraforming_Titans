const EffectableEntity = require('../src/js/effectable-entity');

describe('Ghg factory solver cap', () => {
  let GhgFactory;

  const baseConfig = () => ({
    name: 'GHG Factory',
    category: 'terraforming',
    description: '',
    cost: {},
    consumption: {},
    production: { atmospheric: { greenhouseGas: 10 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    requiresWorker: 0,
    maintenanceFactor: 1,
    unlocked: true,
    reversalAvailable: false,
    defaultRecipe: 'ghg',
    recipes: {
      ghg: {
        displayName: 'GHG Factory',
        production: { atmospheric: { greenhouseGas: 10 } }
      },
      calcite: {
        displayName: 'Calcite Factory',
        production: { atmospheric: { calciteAerosol: 10 } }
      }
    }
  });

  const setTerraforming = (baseTemp) => {
    global.terraforming = {
      temperature: { value: baseTemp, trendValue: baseTemp },
      resources: global.resources,
      saveTemperatureState() {
        return { value: this.temperature.value, trendValue: this.temperature.trendValue };
      },
      restoreTemperatureState(snapshot) {
        this.temperature.value = snapshot.value;
        this.temperature.trendValue = snapshot.trendValue;
      },
      updateSurfaceTemperature() {
        const ghg = this.resources.atmospheric.greenhouseGas.value || 0;
        const calcite = this.resources.atmospheric.calciteAerosol.value || 0;
        const value = baseTemp + ghg - calcite;
        this.temperature.value = value;
        this.temperature.trendValue = value;
      }
    };
  };

  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
    global.maintenanceFraction = 0;
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.resources = {
      colony: {},
      atmospheric: {
        greenhouseGas: { value: 0 },
        calciteAerosol: { value: 0 }
      }
    };
    global.researchManager = {
      getResearchById: () => ({ isResearched: true })
    };
    setTerraforming(200);
    const { Building } = require('../src/js/building');
    global.Building = Building;
    ({ GhgFactory } = require('../src/js/buildings/GhgFactory'));
  });

  afterEach(() => {
    global.EffectableEntity = null;
    global.maintenanceFraction = null;
    global.populationModule = null;
    global.resources = null;
    global.researchManager = null;
    global.terraforming = null;
    global.Building = null;
  });

  const createFactory = () => {
    const factory = new GhgFactory(baseConfig(), 'ghgFactory');
    factory.active = 1;
    factory.count = 1;
    factory.booleanFlags.add('terraformingBureauFeature');
    return factory;
  };

  test('runs at full productivity when the target is far away', () => {
    const factory = createFactory();
    const settings = GhgFactory.getAutomationSettings();
    settings.autoDisableAboveTemp = true;
    settings.disableTempThreshold = 400;
    settings.reverseTempThreshold = 401;

    factory.updateProductivity(global.resources, 100);

    expect(factory.productivity).toBeCloseTo(1, 4);
  });

  test('reuses solver output during the cooldown window', () => {
    setTerraforming(400);
    const factory = createFactory();
    factory.currentRecipeKey = 'calcite';
    factory._applyRecipeMapping();
    const settings = GhgFactory.getAutomationSettings();
    settings.autoDisableAboveTemp = true;
    settings.disableTempThreshold = 300;
    settings.reverseTempThreshold = 301;

    factory.updateProductivity(global.resources, 100);
    const firstProductivity = factory.productivity;
    global.resources.atmospheric.calciteAerosol.value = 50;

    factory.updateProductivity(global.resources, 100);

    expect(factory.productivity).toBeCloseTo(firstProductivity, 4);
  });
});
