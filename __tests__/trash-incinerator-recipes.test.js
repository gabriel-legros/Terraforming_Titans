const EffectableEntity = require('../src/js/effectable-entity');

describe('Trash incinerator recipes', () => {
  let MultiRecipesBuilding;

  const baseConfig = () => ({
    name: 'Trash Incinerator',
    category: 'waste',
    description: 'Burns trash using oxygen to produce carbon dioxide.',
    cost: { colony: { metal: 200, components: 20 } },
    consumption: { colony: { energy: 500000 }, surface: { trash: 100 }, atmospheric: { oxygen: 106.67 } },
    production: { atmospheric: { carbonDioxide: 146.67 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: true,
    requiresWorker: 100,
    maintenanceFactor: 1,
    unlocked: false,
    defaultRecipe: 'trash',
    recipes: {
      trash: {
        shortName: 'Trash',
        consumption: { colony: { energy: 500000 }, surface: { trash: 100 }, atmospheric: { oxygen: 106.67 } },
        production: { atmospheric: { carbonDioxide: 146.67 } }
      },
      hazardousBiomass: {
        shortName: 'Hazardous Biomass',
        requiresResearchFlag: 'hazardousBiomassIncineration',
        consumption: { colony: { energy: 500000 }, surface: { hazardousBiomass: 100 }, atmospheric: { oxygen: 106.67 } },
        production: { atmospheric: { carbonDioxide: 146.67 } }
      }
    }
  });

  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
    global.maintenanceFraction = 0;
    global.resources = { colony: {}, surface: {}, atmospheric: {} };
    global.dayNightCycle = { isDay: () => true };
    global.buildings = {};
    global.updateBuildingDisplay = jest.fn();
    global.spaceManager = { isArtificialWorld: () => false };
    global.researchManager = {
      isArtificialWorld: () => false,
      isBooleanFlagSet: () => false
    };
    const { Building } = require('../src/js/building');
    global.Building = Building;
    ({ MultiRecipesBuilding } = require('../src/js/buildings/MultiRecipesBuilding'));
    global.MultiRecipesBuilding = MultiRecipesBuilding;
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

  test('defaults to the trash recipe', () => {
    const incinerator = new MultiRecipesBuilding(baseConfig(), 'trashIncinerator');

    expect(incinerator.currentRecipeKey).toBe('trash');
    expect(incinerator.consumption.surface.trash).toBe(100);
    expect(incinerator.consumption.surface.hazardousBiomass).toBeUndefined();
  });

  test('switches to the hazardous biomass recipe', () => {
    const incinerator = new MultiRecipesBuilding(baseConfig(), 'trashIncinerator');

    researchManager.isBooleanFlagSet = (flagId) => flagId === 'hazardousBiomassIncineration';
    incinerator.setRecipe('hazardousBiomass');

    expect(incinerator.consumption.surface.trash).toBeUndefined();
    expect(incinerator.consumption.surface.hazardousBiomass).toBe(100);
  });

  test('blocks hazardous biomass recipe without research', () => {
    const incinerator = new MultiRecipesBuilding(baseConfig(), 'trashIncinerator');

    const updated = incinerator.setRecipe('hazardousBiomass');

    expect(updated).toBe(false);
    expect(incinerator.currentRecipeKey).toBe('trash');
  });
});

describe('Hazardous biomass zonal consumption', () => {
  let Resource;
  let Terraforming;

  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = EffectableEntity;
    global.lifeParameters = {};
    ({ Resource } = require('../src/js/resource'));
    Terraforming = require('../src/js/terraforming/terraforming.js');
  });

  afterEach(() => {
    global.EffectableEntity = null;
    global.lifeParameters = null;
    global.resources = null;
  });

  test('distributes hazardous biomass consumption across zones', () => {
    const hazardousResource = new Resource({
      name: 'hazardousBiomass',
      category: 'surface',
      initialValue: 200
    });
    const resources = {
      surface: {
        land: { value: 1 },
        hazardousBiomass: hazardousResource
      },
      atmospheric: {
        carbonDioxide: { value: 0 },
        oxygen: { value: 0 },
        inertGas: { value: 0 }
      }
    };
    const celestialParameters = {
      radius: 1,
      surfaceArea: 4 * Math.PI,
      crossSectionArea: Math.PI,
      gravity: 9.81,
      parentBody: {}
    };
    const terraforming = new Terraforming(resources, celestialParameters);
    global.resources = resources;

    terraforming.zonalSurface.tropical.hazardousBiomass = 100;
    terraforming.zonalSurface.temperate.hazardousBiomass = 50;
    terraforming.zonalSurface.polar.hazardousBiomass = 50;

    hazardousResource.modifyRate(-40, 'Trash Incinerator', 'building');
    terraforming.distributeGlobalChangesToZones(1000);

    expect(terraforming.zonalSurface.tropical.hazardousBiomass).toBe(80);
    expect(terraforming.zonalSurface.temperate.hazardousBiomass).toBe(40);
    expect(terraforming.zonalSurface.polar.hazardousBiomass).toBe(40);
  });
});
