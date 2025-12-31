const EffectableEntity = require('../src/js/effectable-entity');

describe('Chemical reactor automation', () => {
  let ChemicalReactor;

  const baseConfig = () => ({
    name: 'Chemical Reactor',
    category: 'terraforming',
    description: 'Configurable reactors that combine imported hydrogen with atmospheric resources.',
    cost: {},
    consumption: { colony: { energy: 100000 } },
    production: {},
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: false,
    requiresWorker: 0,
    maintenanceFactor: 1,
    unlocked: true,
    defaultRecipe: 'recipe1',
    recipes: {
      recipe1: {
        shortName: 'Bosch Reaction',
        consumption: {
          colony: { energy: 100000 },
          atmospheric: { carbonDioxide: 100, hydrogen: 9.09 }
        },
        production: { colony: { water: 81.82 } }
      },
      recipe2: {
        shortName: 'Water Synthesis',
        consumption: {
          colony: { energy: 100000 },
          atmospheric: { oxygen: 72.73, hydrogen: 9.09 }
        },
        production: { colony: { water: 81.82 } }
      },
      recipe3: {
        shortName: 'Methane Synthesis',
        consumption: {
          colony: { energy: 100000 },
          atmospheric: { carbonDioxide: 100, hydrogen: 18.18 }
        },
        production: {
          atmospheric: { atmosphericMethane: 36.36 },
          colony: { water: 81.82 }
        }
      }
    }
  });

  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
    global.maintenanceFraction = 0;
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
    global.dayNightCycle = { isDay: () => true, isNight: () => false };
    global.buildings = {};
    global.updateBuildingDisplay = jest.fn();
    global.researchManager = {
      getResearchById: () => ({ isResearched: true }),
      isArtificialWorld: () => false
    };
    global.spaceManager = { isArtificialWorld: () => false };
    global.resources = {
      colony: {
        energy: { value: 1000, consumptionRate: 0, productionRate: 0 },
        water: { value: 0, consumptionRate: 0, productionRate: 0 }
      },
      atmospheric: {
        carbonDioxide: { value: 0, consumptionRate: 0, productionRate: 0 },
        hydrogen: { value: 0, consumptionRate: 0, productionRate: 0 },
        oxygen: { value: 0, consumptionRate: 0, productionRate: 0 },
        atmosphericMethane: { value: 0, consumptionRate: 0, productionRate: 0 }
      }
    };
    global.terraforming = {
      celestialParameters: {
        gravity: 9.81,
        radius: 6371000
      }
    };
    global.calculateAtmosphericPressure = jest.fn(() => 2000);
    const { Building } = require('../src/js/building');
    global.Building = Building;
    const { MultiRecipesBuilding } = require('../src/js/buildings/MultiRecipesBuilding');
    global.MultiRecipesBuilding = MultiRecipesBuilding;
    ({ ChemicalReactor } = require('../src/js/buildings/ChemicalReactor'));
  });

  afterEach(() => {
    global.EffectableEntity = null;
    global.maintenanceFraction = null;
    global.populationModule = null;
    global.dayNightCycle = null;
    global.buildings = null;
    global.updateBuildingDisplay = null;
    global.researchManager = null;
    global.spaceManager = null;
    global.resources = null;
    global.Building = null;
    global.MultiRecipesBuilding = null;
    global.terraforming = null;
    global.calculateAtmosphericPressure = null;
  });

  const createReactor = () => {
    const reactor = new ChemicalReactor(baseConfig(), 'boschReactor');
    reactor.active = 1;
    reactor.count = 1;
    reactor.booleanFlags.add('terraformingBureauFeature');
    return reactor;
  };

  test('disables when an input resource exceeds the threshold', () => {
    const reactor = createReactor();
    const settings = ChemicalReactor.getAutomationSettings();
    settings.autoDisable = true;
    settings.mode = 'input';
    settings.operator = '>';
    settings.resourceCategory = 'atmospheric';
    settings.resourceId = 'carbonDioxide';
    settings.amount = 50;
    global.resources.atmospheric.carbonDioxide.value = 100;

    reactor.updateProductivity(global.resources, 1000);

    expect(reactor.productivity).toBe(0);
  });

  test('disables when an output resource falls below the threshold', () => {
    const reactor = createReactor();
    const settings = ChemicalReactor.getAutomationSettings();
    settings.autoDisable = true;
    settings.mode = 'output';
    settings.operator = '<';
    settings.resourceCategory = 'colony';
    settings.resourceId = 'water';
    settings.amount = 100;
    global.resources.colony.water.value = 50;

    reactor.updateProductivity(global.resources, 1000);

    expect(reactor.productivity).toBe(0);
  });

  test('uses atmospheric pressure units when selected', () => {
    const reactor = createReactor();
    const settings = ChemicalReactor.getAutomationSettings();
    settings.autoDisable = true;
    settings.mode = 'input';
    settings.operator = '>';
    settings.resourceCategory = 'atmospheric';
    settings.resourceId = 'carbonDioxide';
    settings.unit = 'kPa';
    settings.amount = 1;

    reactor.updateProductivity(global.resources, 1000);

    expect(global.calculateAtmosphericPressure).toHaveBeenCalled();
    expect(reactor.productivity).toBe(0);
  });
});
