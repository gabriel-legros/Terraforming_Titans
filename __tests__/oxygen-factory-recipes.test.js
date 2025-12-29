const EffectableEntity = require('../src/js/effectable-entity');

describe('Oxygen factory recipes', () => {
  let OxygenFactory;

  const baseConfig = () => ({
    name: 'Oxygen Factory',
    category: 'terraforming',
    description: 'Extracts oxygen from liquid water via electrolysis or uses energy to liberate oxygen from silicates.',
    cost: { colony: { metal: 1000, glass: 10, components: 10, electronics: 10 } },
    consumption: { colony: { energy: 24000000 } },
    production: { atmospheric: { oxygen: 88.89, hydrogen: 11.11 } },
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
        consumption: { colony: { water: 100 } }
      },
      silicates: {
        shortName: 'Silicates -> Oxygen',
        production: { atmospheric: { oxygen: 88.89 } }
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
    global.Building = null;
    global.MultiRecipesBuilding = null;
  });

  test('defaults to the water electrolysis recipe', () => {
    const factory = new OxygenFactory(baseConfig(), 'oxygenFactory');

    expect(factory.currentRecipeKey).toBe('water');
    expect(factory.consumption.colony.water).toBe(100);
    expect(factory.production.atmospheric.hydrogen).toBe(11.11);
  });

  test('switches to the silicates recipe without water or hydrogen', () => {
    const factory = new OxygenFactory(baseConfig(), 'oxygenFactory');

    factory.setRecipe('silicates');

    expect(factory.consumption.colony.water).toBeUndefined();
    expect(factory.production.atmospheric.hydrogen).toBeUndefined();
    expect(factory.production.atmospheric.oxygen).toBe(88.89);
  });
});
