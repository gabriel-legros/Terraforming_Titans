const fs = require('fs');
const Module = require('module');
const path = require('path');
const vm = require('vm');

global.EffectableEntity = class {
  constructor() {
    this.booleanFlags = new Set();
  }
  applyBooleanFlag() {}
  removeBooleanFlag() {}
  isBooleanFlagSet(flagId) {
    return this.booleanFlags.has(flagId);
  }
};

global.lifeParameters = {};

require(path.join('..', 'src/js/planet-resource-parameters.js'));
const zones = require(path.join('..', 'src/js/terraforming/zones.js'));
const { terraformingRequirements } = require(path.join('..', 'src/js/terraforming/terraforming-requirements.js'));
global.ZONES = zones.ZONES;
global.getZonePercentage = zones.getZonePercentage;
global.getZoneRatio = zones.getZoneRatio;
global.estimateCoverage = zones.estimateCoverage;
global.calculateEffectiveAtmosphericHeatCapacity = () => 0;
global.waterCycle = {};
global.methaneCycle = {};
global.co2Cycle = {};
global.ammoniaCycle = {};
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
  ammonia: {
    surfaceKeys: { liquid: 'liquidAmmonia', ice: 'ammoniaIce', buriedIce: 'buriedAmmoniaIce' },
    legacyZonalKey: 'zonalAmmonia'
  },
};

function loadTerraforming() {
  const fullPath = path.resolve(__dirname, '..', 'src/js/terraforming/terraforming.js');
  const code = fs.readFileSync(fullPath, 'utf8')
    .replace('var resourcePhaseGroups;', `var resourcePhaseGroups = ${JSON.stringify(RESOURCE_PHASE_GROUPS)};`)
    .replace(
      'var getZonePercentage, estimateCoverage, waterCycleInstance, methaneCycleInstance, co2CycleInstance, ammoniaCycleInstance;',
      'var getZonePercentage, estimateCoverage, waterCycleInstance, methaneCycleInstance, co2CycleInstance, ammoniaCycleInstance;\ngetZonePercentage = global.getZonePercentage;\nestimateCoverage = global.estimateCoverage;'
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
    ammoniaCycle: global.ammoniaCycle,
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

const Terraforming = loadTerraforming();
const { HazardManager, setHazardManager } = require(path.join('..', 'src/js/terraforming/hazard.js'));

function createTerraformingInstance({ hasNaturalMagnetosphere = false } = {}) {
  const resources = {
    surface: {
      land: { value: 1 },
      liquidWater: { value: 0 },
      ice: { value: 0 },
      dryIce: { value: 0 },
      biomass: { value: 0 },
      hazardousBiomass: { value: 0 },
      liquidCO2: { value: 0 },
      liquidMethane: { value: 0 },
      hydrocarbonIce: { value: 0 }
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
    hasNaturalMagnetosphere,
    parentBody: {}
  };

  const terraforming = new Terraforming(resources, celestialParameters);
  terraforming.surfaceRadiation = 1;
  global.resources = resources;
  return terraforming;
}

function setupHazards(hazardParams) {
  const manager = new HazardManager();
  setHazardManager(manager);
  manager.initialize(hazardParams);
  return manager;
}

describe('Hazardous biomass radiation growth penalty', () => {
  test('skips radiation penalty when a natural magnetosphere is present', () => {
    const terraforming = createTerraformingInstance({ hasNaturalMagnetosphere: true });
    const manager = setupHazards({
      hazardousBiomass: {
        radiationPreference: { min: 0, max: 0.01, unit: 'mSv/day', severity: 0.1 }
      }
    });

    const penalty = manager.calculateHazardousBiomassGrowthPenalty(
      manager.parameters.hazardousBiomass,
      terraforming
    );
    expect(penalty).toBe(0);
  });

  test('applies radiation penalty when no magnetosphere exists', () => {
    const terraforming = createTerraformingInstance();
    const manager = setupHazards({
      hazardousBiomass: {
        radiationPreference: { min: 0, max: 0.01, unit: 'mSv/day', severity: 0.1 }
      }
    });

    const penalty = manager.calculateHazardousBiomassGrowthPenalty(
      manager.parameters.hazardousBiomass,
      terraforming
    );
    expect(penalty).toBeGreaterThan(0);
  });
});
