const EffectableEntity = require('../src/js/effectable-entity');

describe('Dust factory automation', () => {
  let DustFactory;

  const baseConfig = () => ({
    name: 'Black Dust Factory',
    category: 'terraforming',
    description: '',
    cost: {},
    consumption: {},
    production: { special: { albedoUpgrades: 100 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    requiresWorker: 0,
    maintenanceFactor: 1,
    unlocked: true,
    reversalAvailable: true,
    defaultRecipe: 'black',
    recipes: {
      black: {
        displayName: 'Black Dust Factory',
        production: { special: { albedoUpgrades: 100 } },
        reverseTarget: { category: 'special', resource: 'albedoUpgrades' }
      },
      white: {
        displayName: 'White Dust Factory',
        production: { special: { whiteDust: 100 } },
        reverseTarget: { category: 'special', resource: 'whiteDust' }
      }
    }
  });

  const setTerraforming = () => {
    global.terraforming = {
      celestialParameters: {
        albedo: 0.3,
        surfaceArea: 100
      },
      resources: global.resources,
      calculateGroundAlbedo() {
        const baseAlbedo = this.celestialParameters.albedo;
        const blackAlbedo = 0.05;
        const whiteAlbedo = 0.8;
        const surfaceArea = this.celestialParameters.surfaceArea;
        const black = this.resources.special.albedoUpgrades.value;
        const white = this.resources.special.whiteDust.value;
        const bRatioRaw = surfaceArea > 0 ? Math.max(0, black / surfaceArea) : 0;
        const wRatioRaw = surfaceArea > 0 ? Math.max(0, white / surfaceArea) : 0;
        const totalApplied = Math.min(bRatioRaw + wRatioRaw, 1);
        let shareBlack = 0;
        let shareWhite = 0;
        if (totalApplied > 0) {
          const sumRaw = bRatioRaw + wRatioRaw;
          shareWhite = (wRatioRaw / sumRaw) * totalApplied;
          shareBlack = totalApplied - shareWhite;
        }
        const untouched = Math.max(0, 1 - totalApplied);
        return (blackAlbedo * shareBlack) + (whiteAlbedo * shareWhite) + (baseAlbedo * untouched);
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
      special: {
        albedoUpgrades: { value: 0 },
        whiteDust: { value: 0 }
      }
    };
    global.researchManager = {
      getResearchById: () => ({ isResearched: true })
    };
    setTerraforming();
    const { Building } = require('../src/js/building');
    global.Building = Building;
    ({ DustFactory } = require('../src/js/buildings/DustFactory'));
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
    const factory = new DustFactory(baseConfig(), 'dustFactory');
    factory.active = 1;
    factory.count = 1;
    factory.booleanFlags.add('terraformingBureauFeature');
    return factory;
  };

  const enableTargeting = (settings, target) => {
    settings.autoTargetAlbedo = true;
    settings.targetAlbedo = target;
    settings.hasCustomTarget = true;
    settings.initialized = true;
  };

  test('halts when the target albedo is reached', () => {
    const factory = createFactory();
    const settings = DustFactory.getAutomationSettings();
    enableTargeting(settings, 0.3);

    factory.updateProductivity(global.resources, 1000);

    expect(factory.productivity).toBe(0);
  });

  test('targets lower albedo with black dust production', () => {
    const factory = createFactory();
    factory.reversalAvailable = false;
    const settings = DustFactory.getAutomationSettings();
    enableTargeting(settings, 0.2);

    factory.updateProductivity(global.resources, 1000);

    expect(factory.currentRecipeKey).toBe('black');
    expect(factory.reverseEnabled).toBe(false);
    expect(factory.productivity).toBeGreaterThan(0);
  });

  test('reverses black dust to raise albedo when available', () => {
    global.resources.special.albedoUpgrades.value = 50;
    setTerraforming();
    const factory = createFactory();
    const settings = DustFactory.getAutomationSettings();
    enableTargeting(settings, 0.3);

    factory.updateProductivity(global.resources, 1000);

    expect(factory.currentRecipeKey).toBe('black');
    expect(factory.reverseEnabled).toBe(true);
    expect(factory.productivity).toBeGreaterThan(0);
  });
});
