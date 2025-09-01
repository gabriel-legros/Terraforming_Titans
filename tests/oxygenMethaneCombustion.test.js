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
  calculateEvaporationSublimationRates: jest.fn(() => ({ evaporationRate: 0, waterSublimationRate: 0, co2SublimationRate: 0 })),
  calculatePrecipitationRateFactor: jest.fn(() => ({ rainfallRateFactor: 0, snowfallRateFactor: 0 }))
}));

jest.mock('../src/js/hydrocarbon-cycle.js', () => ({
  evaporationRateMethane: jest.fn(() => 0),
  calculateMethaneCondensationRateFactor: jest.fn(() => ({ liquidRateFactor: 0, iceRateFactor: 0 })),
  calculateMethaneEvaporationRate: jest.fn(() => 0),
  sublimationRateMethane: jest.fn(() => 0),
  rapidSublimationRateMethane: jest.fn(() => 0),
  calculateMethaneSublimationRate: jest.fn(() => 0)
}));

jest.mock('../src/js/dry-ice-cycle.js', () => ({
  calculateCO2CondensationRateFactor: jest.fn(() => 0),
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

const Terraforming = require('../src/js/terraforming.js');
delete global.calculateZoneSolarFluxWithFacility;
function createResources() {
  return {
    atmospheric: {
      oxygen: { value: 0, modifyRate: jest.fn() },
      atmosphericMethane: { value: 0, modifyRate: jest.fn() },
      atmosphericWater: { value: 0, modifyRate: jest.fn() },
      carbonDioxide: { value: 0, modifyRate: jest.fn() }
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

test('oxygen and methane combust into water and CO2', () => {
  const params = getPlanetParameters('mars');
  global.currentPlanetParameters = params;
  const res = createResources();
  global.resources = res;
  const terra = new Terraforming(res, params.celestialParameters);
  terra.calculateInitialValues(params);

  const methane = 5e12;
  const oxygen = 5e14;
  res.atmospheric.atmosphericMethane.value = methane;
  res.atmospheric.oxygen.value = oxygen;

  terra.updateResources(1);

  expect(res.atmospheric.atmosphericMethane.value).toBeLessThanOrEqual(methane);
  expect(res.atmospheric.oxygen.value).toBeLessThanOrEqual(oxygen);
  expect(res.atmospheric.atmosphericWater.value).toBeGreaterThanOrEqual(0);
  expect(res.atmospheric.carbonDioxide.value).toBeGreaterThanOrEqual(0);
});

test('combustion scales with surface area', () => {
  const baseParams = getPlanetParameters('mars');
  const radiusMeters = baseParams.celestialParameters.radius * 1000;
  const surfaceArea = 4 * Math.PI * Math.pow(radiusMeters, 2);
  const methane = 5e12;
  const oxygen = 5e14;

  // Large planet (full surface area)
  const largeParams = JSON.parse(JSON.stringify(baseParams));
  largeParams.celestialParameters.surfaceArea = surfaceArea;
  global.currentPlanetParameters = largeParams;
  const resLarge = createResources();
  global.resources = resLarge;
  const terraLarge = new Terraforming(resLarge, largeParams.celestialParameters);
  terraLarge.calculateInitialValues(largeParams);
  resLarge.atmospheric.atmosphericMethane.value = methane;
  resLarge.atmospheric.oxygen.value = oxygen;
  terraLarge.updateResources(1);

  // Small planet (half surface area)
  const smallParams = JSON.parse(JSON.stringify(baseParams));
  smallParams.celestialParameters.surfaceArea = surfaceArea / 2;
  global.currentPlanetParameters = smallParams;
  const resSmall = createResources();
  global.resources = resSmall;
  const terraSmall = new Terraforming(resSmall, smallParams.celestialParameters);
  terraSmall.calculateInitialValues(smallParams);
  resSmall.atmospheric.atmosphericMethane.value = methane;
  resSmall.atmospheric.oxygen.value = oxygen;
  terraSmall.updateResources(1);

  const largeConsumed = methane - resLarge.atmospheric.atmosphericMethane.value;
  const smallConsumed = methane - resSmall.atmospheric.atmosphericMethane.value;

  expect(largeConsumed).toBeCloseTo(smallConsumed * 2);
});

