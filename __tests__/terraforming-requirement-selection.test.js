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

const defaultPlanetResources = require(path.join('..', 'src/js/planet-resource-parameters.js'));
global.defaultPlanetResources = defaultPlanetResources;
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
    defaultPlanetResources: global.defaultPlanetResources,
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

describe('Terraforming requirement selection', () => {
  test('human requirements include total pressure and ammonia targets', () => {
    const human = terraformingRequirements.human;
    expect(human.totalPressureRangeKPa).toEqual({ min: 80, max: 120 });
    expect(human.gasTargetsPa.atmosphericAmmonia).toEqual({ min: 0, max: 10 });
  });

  test('uses specialAttributes.terraformingRequirementId when provided', () => {
    const resources = {
      surface: { land: { value: 1 } },
      atmospheric: { carbonDioxide: { value: 0 }, oxygen: { value: 0 }, inertGas: { value: 0 }, hydrogen: { value: 0 }, atmosphericMethane: { value: 0 } },
    };

    const celestialParameters = {
      radius: 1,
      surfaceArea: 4 * Math.PI,
      crossSectionArea: Math.PI,
      gravity: 9.81,
      hasNaturalMagnetosphere: false,
      parentBody: {},
    };

    const specialAttributes = { terraformingRequirementId: 'gabbagian' };
    const terraforming = new Terraforming(resources, celestialParameters, specialAttributes);
    expect(terraforming.requirements.id).toBe('gabbagian');
    expect(terraforming.requirements.lifeDesign.metabolism.primaryProcessId).toBe('methanogenesis');
  });

  test('atmosphere status checks total pressure target', () => {
    const resources = {
      surface: { land: { value: 1 } },
      atmospheric: {},
    };

    const celestialParameters = {
      radius: 1,
      surfaceArea: 4 * Math.PI,
      crossSectionArea: Math.PI,
      gravity: 9.81,
      hasNaturalMagnetosphere: false,
      parentBody: {},
    };

    const terraforming = new Terraforming(resources, celestialParameters, {});
    terraforming.gasTargets = {};
    terraforming.atmosphere.totalPressureTargetRangeKPa = { min: 1, max: 2 };
    expect(terraforming.getAtmosphereStatus()).toBe(false);
    terraforming.atmosphere.totalPressureTargetRangeKPa = { min: 0, max: 0 };
    expect(terraforming.getAtmosphereStatus()).toBe(true);
  });
});
