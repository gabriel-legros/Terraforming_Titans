const EffectableEntity = require('../src/js/effectable-entity');

describe('Oxygen factory recipes', () => {
  let OxygenFactory;

  const baseConfig = () => ({
    name: 'Oxygen Factory',
    category: 'terraforming',
    description: 'Extracts oxygen from liquid water via electrolysis or uses energy to liberate oxygen from silicates.',
    cost: { colony: { metal: 1000, glass: 10, components: 10, electronics: 10 } },
    consumption: { colony: { energy: 123 } },
    production: { atmospheric: { oxygen: 70, hydrogen: 30 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: true,
    requiresWorker: 0,
    maintenanceFactor: 1,
    unlocked: false,
    defaultRecipe: 'water',
    recipes: {
      water: {
        shortName: 'Water -> Oxygen + Hydrogen',
        consumption: { colony: { energy: 24000000, water: 100 } },
        production: { atmospheric: { oxygen: 88.89, hydrogen: 11.11 } }
      },
      silicates: {
        shortName: 'Silicates -> Oxygen',
        consumption: { colony: { energy: 150000000 } },
        production: { atmospheric: { oxygen: 100 } }
      },
      rocks: {
        shortName: 'Rocks -> Oxygen',
        consumption: { colony: { energy: 150000000 } },
        production: { atmospheric: { oxygen: 100 } },
        artificialAllowed: false
      }
    }
  });

  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
    global.maintenanceFraction = 0;
    global.resources = { colony: {} };
    global.dayNightCycle = { isDay: () => true };
    global.buildings = {};
    global.updateBuildingDisplay = jest.fn();
    global.spaceManager = { isArtificialWorld: () => false };
    global.researchManager = { isArtificialWorld: () => false };
    const { Building } = require('../src/js/building');
    global.Building = Building;
    const { MultiRecipesBuilding } = require('../src/js/buildings/MultiRecipesBuilding');
    global.MultiRecipesBuilding = MultiRecipesBuilding;
    ({ OxygenFactory } = require('../src/js/buildings/OxygenFactory'));
  });

  afterEach(() => {
    global.EffectableEntity = null;
    global.maintenanceFraction = null;
    global.resources = null;
    global.dayNightCycle = null;
    global.buildings = null;
    global.updateBuildingDisplay = null;
    global.spaceManager = null;
    global.researchManager = null;
    global.Building = null;
    global.MultiRecipesBuilding = null;
  });

  test('defaults to the water electrolysis recipe', () => {
    const factory = new OxygenFactory(baseConfig(), 'oxygenFactory');

    expect(factory.currentRecipeKey).toBe('water');
    expect(factory.consumption.colony.water).toBe(100);
    expect(factory.consumption.colony.energy).toBe(24000000);
    expect(factory.production.atmospheric.hydrogen).toBe(11.11);
  });

  test('switches to the silicates recipe without water or hydrogen', () => {
    const factory = new OxygenFactory(baseConfig(), 'oxygenFactory');

    factory.setRecipe('silicates');

    expect(factory.consumption.colony.water).toBeUndefined();
    expect(factory.consumption.colony.energy).toBe(150000000);
    expect(factory.production.atmospheric.hydrogen).toBeUndefined();
    expect(factory.production.atmospheric.oxygen).toBe(100);
  });

  test('drops the rocks recipe on artificial worlds', () => {
    const factory = new OxygenFactory(baseConfig(), 'oxygenFactory');
    factory.setRecipe('rocks');
    expect(factory.currentRecipeKey).toBe('rocks');

    global.researchManager.isArtificialWorld = () => true;
    global.spaceManager.isArtificialWorld = () => true;
    factory._applyRecipeMapping();

    expect(factory.currentRecipeKey).not.toBe('rocks');
    const options = factory._getRecipeOptions().map(option => option.key);
    expect(options).not.toContain('rocks');
  });
});
