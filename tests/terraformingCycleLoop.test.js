const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');

jest.mock('../src/js/hydrology.js', () => ({
  simulateSurfaceWaterFlow: jest.fn(() => ({ totalMelt: 0, changes: { tropical: {}, temperate: {}, polar: {} } })),
  simulateSurfaceHydrocarbonFlow: jest.fn(() => ({ totalMelt: 0, changes: { tropical: {}, temperate: {}, polar: {} } })),
  calculateMethaneMeltingFreezingRates: jest.fn(() => ({ meltingRate: 0, freezingRate: 0 })),
  calculateMeltingFreezingRates: jest.fn(() => ({ meltingRate: 0, freezingRate: 0 }))
}));

jest.mock('../src/js/terraforming-utils.js', () => ({
  calculateAverageCoverage: jest.fn(() => 0),
  calculateSurfaceFractions: jest.fn(() => ({})),
  calculateZonalSurfaceFractions: jest.fn(() => ({}))
}));

jest.mock('../src/js/terraforming/water-cycle.js', () => ({
  waterCycle: {
    runCycle: jest.fn(tf => {
      tf.zonalWater.tropical.liquid += 2;
      return {
        evaporation: 2,
        sublimation: 0,
        melt: 0,
        freeze: 0,
        totalAtmosphericChange: 5,
        rain: 1,
        snow: 0,
      };
    }),
  },
  boilingPointWater: jest.fn(() => 373.15),
}));

jest.mock('../src/js/terraforming/hydrocarbon-cycle.js', () => ({
  methaneCycle: {
    runCycle: jest.fn(() => ({
      evaporation: 0,
      sublimation: 0,
      melt: 0,
      freeze: 0,
      totalAtmosphericChange: 0,
      methaneRain: 0,
      methaneSnow: 0,
    })),
  },
  boilingPointMethane: jest.fn(() => 112),
}));

jest.mock('../src/js/terraforming/dry-ice-cycle.js', () => ({
  co2Cycle: {
    runCycle: jest.fn(() => ({
      sublimation: 0,
      totalAtmosphericChange: 0,
      condensation: 0,
    })),
  },
}));

jest.mock('../src/js/radiation-utils.js', () => ({
  estimateSurfaceDoseByColumn: jest.fn(() => 0),
  radiationPenalty: jest.fn(() => 0),
}));

global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.projectManager = { projects: { spaceMirrorFacility: { isBooleanFlagSet: () => false } }, isBooleanFlagSet: () => false };
global.mirrorOversightSettings = {};
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.calculateEmissivity = physics.calculateEmissivity;
global.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
global.effectiveTemp = physics.effectiveTemp;
global.surfaceAlbedoMix = physics.surfaceAlbedoMix;
global.cloudFraction = physics.cloudFraction;
global.calculateActualAlbedoPhysics = physics.calculateActualAlbedoPhysics;
global.airDensity = physics.airDensity;
global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;

const Terraforming = require('../src/js/terraforming.js');

delete global.calculateZoneSolarFluxWithFacility;

function createResources() {
  return {
    atmospheric: {
      oxygen: { value: 0, modifyRate: jest.fn() },
      atmosphericMethane: { value: 0, modifyRate: jest.fn() },
      atmosphericWater: { value: 0, modifyRate: jest.fn() },
      carbonDioxide: { value: 0, modifyRate: jest.fn() },
    },
    surface: {
      liquidWater: { value: 0, modifyRate: jest.fn() },
      ice: { value: 0, modifyRate: jest.fn() },
      dryIce: { value: 0, modifyRate: jest.fn() },
      liquidMethane: { value: 0, modifyRate: jest.fn() },
      hydrocarbonIce: { value: 0, modifyRate: jest.fn() },
    },
    colony: { colonists: { value: 0 }, workers: { value: 0, cap: 0 } },
    special: { albedoUpgrades: { value: 0 } },
  };
}

test('water cycle updates via loop', () => {
  const params = getPlanetParameters('mars');
  global.currentPlanetParameters = params;
  const res = createResources();
  global.resources = res;
  const terra = new Terraforming(res, params.celestialParameters);
  terra.calculateInitialValues(params);

  terra.updateResources(1);
  expect(require('../src/js/terraforming/water-cycle.js').waterCycle.runCycle).toHaveBeenCalledTimes(1);
  expect(require('../src/js/terraforming/hydrocarbon-cycle.js').methaneCycle.runCycle).toHaveBeenCalledTimes(1);
  expect(require('../src/js/terraforming/dry-ice-cycle.js').co2Cycle.runCycle).toHaveBeenCalledTimes(1);
  expect(terra.zonalWater.tropical.liquid).toBe(2);
});
