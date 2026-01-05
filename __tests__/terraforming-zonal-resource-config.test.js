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
global.calculateAverageCoverage = () => 0;

const defaultPlanetResources = {
  surface: {
    land: { name: 'Land' },
    liquidWater: {
      zonalConfig: {
        keys: ['liquidWater'],
        distributionKey: 'liquidWater',
        distribution: { production: 'skip', consumption: 'skip' },
      },
    },
    ice: {
      zonalConfig: {
        keys: ['ice', 'buriedIce'],
        distributionKey: 'ice',
        distribution: { production: 'area', consumption: 'currentAmount' },
      },
    },
  },
};
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
    legacyZonalKey: 'zonalWater',
  },
  carbonDioxide: {
    surfaceKeys: { liquid: 'liquidCO2', ice: 'dryIce', buriedIce: 'buriedDryIce' },
    legacyZonalKey: 'zonalCO2',
  },
  methane: {
    surfaceKeys: { liquid: 'liquidMethane', ice: 'hydrocarbonIce', buriedIce: 'buriedHydrocarbonIce' },
    legacyZonalKey: 'zonalHydrocarbons',
  },
  ammonia: {
    surfaceKeys: { liquid: 'liquidAmmonia', ice: 'ammoniaIce', buriedIce: 'buriedAmmoniaIce' },
    legacyZonalKey: 'zonalAmmonia',
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

function createTerraformingInstance(resources) {
  const celestialParameters = {
    radius: 1,
    surfaceArea: 4 * Math.PI,
    crossSectionArea: Math.PI,
    gravity: 9.81,
    hasNaturalMagnetosphere: false,
    parentBody: {},
  };
  const terraforming = new Terraforming(resources, celestialParameters);
  Terraforming.__context.resources = resources;
  return terraforming;
}

describe('Terraforming zonal resource config', () => {
  test('distributeGlobalChangesToZones respects distribution mode from resource config', () => {
    const resources = {
      surface: {
        land: { value: 1 },
        liquidWater: {
          value: 0,
          productionRateByType: { building: { extractor: 100 } },
          consumptionRateByType: {},
          zonalConfig: {
            keys: ['liquidWater'],
            distributionKey: 'liquidWater',
            distribution: { production: 'skip', consumption: 'skip' },
          },
        },
        ice: {
          value: 0,
          productionRateByType: {},
          consumptionRateByType: {},
        },
      },
      atmospheric: {
        carbonDioxide: { value: 0 },
        oxygen: { value: 0 },
        inertGas: { value: 0 },
      },
    };
    const terraforming = createTerraformingInstance(resources);
    terraforming.distributeGlobalChangesToZones(1000);
    for (const zone of zones.ZONES) {
      expect(terraforming.zonalSurface[zone].liquidWater).toBe(0);
    }
  });

  test('synchronizeGlobalResources uses configured zonal aggregation keys', () => {
    const resources = {
      surface: {
        land: { value: 1 },
        ice: {
          value: 0,
          zonalConfig: {
            keys: ['ice', 'buriedIce'],
            distributionKey: 'ice',
            distribution: { production: 'area', consumption: 'currentAmount' },
          },
        },
        liquidWater: { value: 0 },
      },
      atmospheric: {
        carbonDioxide: { value: 0 },
        oxygen: { value: 0 },
        inertGas: { value: 0 },
      },
    };
    const terraforming = createTerraformingInstance(resources);
    terraforming.zonalSurface.polar.ice = 2;
    terraforming.zonalSurface.polar.buriedIce = 3;
    terraforming.zonalSurface.temperate.ice = 1;
    terraforming.synchronizeGlobalResources();
    expect(resources.surface.ice.value).toBe(6);
  });
});
