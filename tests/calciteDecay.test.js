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
    processZone: jest.fn(() => ({
      atmosphere: { water: 0 },
      water: { liquid: 0, ice: 0, buriedIce: 0 },
      precipitation: { potentialRain: 0, potentialSnow: 0 },
      evaporationAmount: 0,
      sublimationAmount: 0,
      meltAmount: 0,
      freezeAmount: 0,
    })),
  },
  boilingPointWater: jest.fn(() => 373.15)
}));

jest.mock('../src/js/hydrocarbon-cycle.js', () => ({
  evaporationRateMethane: jest.fn(() => 0),
  methaneCycle: { condensationRateFactor: jest.fn(() => ({ liquidRate: 0, iceRate: 0 })) },
  calculateMethaneEvaporationRate: jest.fn(() => 0),
  sublimationRateMethane: jest.fn(() => 0),
  rapidSublimationRateMethane: jest.fn(() => 0),
  calculateMethaneSublimationRate: jest.fn(() => 0),
  boilingPointMethane: jest.fn(() => 112)
}));

jest.mock('../src/js/dry-ice-cycle.js', () => ({
  co2Cycle: {
    condensationRateFactor: jest.fn(() => ({ iceRate: 0 })),
    sublimationRate: jest.fn(() => 0),
  },
  rapidSublimationRateCO2: jest.fn(() => 0)
}));

jest.mock('../src/js/radiation-utils.js', () => ({
  estimateSurfaceDoseByColumn: jest.fn(() => 0),
  radiationPenalty: jest.fn(() => 0)
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

delete global.calculateZoneSolarFluxWithFacility;

const Terraforming = require('../src/js/terraforming.js');

function createResources() {
  return {
    atmospheric: {
      calciteAerosol: { value: 0, modifyRate: jest.fn() },
      atmosphericWater: { value: 0, modifyRate: jest.fn() },
      carbonDioxide: { value: 0, modifyRate: jest.fn() },
      atmosphericMethane: { value: 0, modifyRate: jest.fn() },
      oxygen: { value: 0, modifyRate: jest.fn() }
    },
    surface: {
      liquidWater: { value: 0, modifyRate: jest.fn() },
      ice: { value: 0, modifyRate: jest.fn() },
      dryIce: { value: 0, modifyRate: jest.fn() },
      liquidMethane: { value: 0, modifyRate: jest.fn() },
      hydrocarbonIce: { value: 0, modifyRate: jest.fn() }
    },
    colony: { colonists: { value: 0 }, workers: { value: 0, cap: 0 } },
    special: { albedoUpgrades: { value: 0 } }
  };
}

test('calcite aerosol decays with 240s half-life and rate is tracked', () => {
  const params = getPlanetParameters('mars');
  global.currentPlanetParameters = params;
  const res = createResources();
  global.resources = res;
  const terra = new Terraforming(res, params.celestialParameters);
  terra.calculateInitialValues(params);

  const initial = 1000;
  res.atmospheric.calciteAerosol.value = initial;

  terra.updateResources(240000);

  expect(res.atmospheric.calciteAerosol.value).toBeCloseTo(initial / 2, 5);
  const decayCall = res.atmospheric.calciteAerosol.modifyRate.mock.calls.find(c => c[1] === 'Calcite Decay');
  expect(decayCall).toBeDefined();
  expect(decayCall[0]).toBeCloseTo(-initial / 480, 5);
});
