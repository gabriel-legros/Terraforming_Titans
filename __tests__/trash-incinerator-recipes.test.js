const fs = require('fs');
const Module = require('module');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity');
const { terraformingRequirements } = require('../src/js/terraforming/terraforming-requirements.js');
const RESOURCE_PHASE_GROUPS = {
  water: {
    surfaceKeys: { liquid: 'liquidWater', ice: 'ice', buriedIce: 'buriedIce' },
    legacyZonalKey: 'zonalWater'
  },
  carbonDioxide: {
    surfaceKeys: { liquid: 'liquidCO2', ice: 'dryIce', buriedIce: 'buriedDryIce' },
    legacyZonalKey: 'zonalCO2'
  },
  methane: {
    surfaceKeys: { liquid: 'liquidMethane', ice: 'hydrocarbonIce', buriedIce: 'buriedHydrocarbonIce' },
    legacyZonalKey: 'zonalHydrocarbons'
  },
};

function loadTerraforming() {
  const fullPath = path.resolve(__dirname, '..', 'src/js/terraforming/terraforming.js');
  const code = fs.readFileSync(fullPath, 'utf8')
    .replace('var resourcePhaseGroups;', `var resourcePhaseGroups = ${JSON.stringify(RESOURCE_PHASE_GROUPS)};`)
    .replace(
      'var getZonePercentage, estimateCoverage, waterCycleInstance, methaneCycleInstance, co2CycleInstance;',
      'var getZonePercentage, estimateCoverage, waterCycleInstance, methaneCycleInstance, co2CycleInstance;\ngetZonePercentage = global.getZonePercentage;\nestimateCoverage = global.estimateCoverage;'
    );
  const context = {
    module: { exports: {} },
    exports: {},
    require: Module.createRequire ? Module.createRequire(fullPath) : require,
    __filename: fullPath,
    __dirname: path.dirname(fullPath),
    console,
    structuredClone: (value) => JSON.parse(JSON.stringify(value)),
    EffectableEntity: global.EffectableEntity,
    lifeParameters: global.lifeParameters,
    calculateAverageCoverage: global.calculateAverageCoverage,
    calculateEffectiveAtmosphericHeatCapacity: global.calculateEffectiveAtmosphericHeatCapacity,
    ZONES: global.ZONES,
    waterCycle: global.waterCycle,
    methaneCycle: global.methaneCycle,
    co2Cycle: global.co2Cycle,
    terraformingRequirements,
    getZonePercentage: global.getZonePercentage,
    estimateCoverage: global.estimateCoverage,
    getZoneRatio: global.getZoneRatio,
  };
  context.global = context;
  context.globalThis = context;
  vm.runInNewContext(code, context, { filename: fullPath });
  context.module.exports.__context = context;
  return context.module.exports;
}

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
    require('../src/js/planet-resource-parameters.js');
    const zones = require('../src/js/terraforming/zones.js');
    global.ZONES = zones.ZONES;
    global.getZonePercentage = zones.getZonePercentage;
    global.getZoneRatio = zones.getZoneRatio;
    global.estimateCoverage = zones.estimateCoverage;
    global.calculateEffectiveAtmosphericHeatCapacity = () => 0;
    global.waterCycle = {};
    global.methaneCycle = {};
    global.co2Cycle = {};
    ({ Resource } = require('../src/js/resource'));
    Terraforming = loadTerraforming();
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
