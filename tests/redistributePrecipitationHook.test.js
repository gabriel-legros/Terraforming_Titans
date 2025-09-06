const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const dryIce = require('../src/js/terraforming/dry-ice-cycle.js');
const hydrocarbon = require('../src/js/terraforming/hydrocarbon-cycle.js');
const water = require('../src/js/terraforming/water-cycle.js');

jest.mock('../src/js/hydrology.js', () => ({
  simulateSurfaceWaterFlow: jest.fn(() => ({ totalMelt: 0, changes: { tropical: {}, temperate: {}, polar: {} } })),
  simulateSurfaceHydrocarbonFlow: jest.fn(() => ({ totalMelt: 0, changes: { tropical: {}, temperate: {}, polar: {} } })),
  calculateMethaneMeltingFreezingRates: jest.fn(() => ({ meltingRate: 0, freezingRate: 0 })),
  calculateMeltingFreezingRates: jest.fn(() => ({ meltingRate: 0, freezingRate: 0 })),
}));

const hydrology = require('../src/js/hydrology.js');

// Required globals for terraforming.js
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

global.sublimationRateCO2 = dryIce.sublimationRateCO2;
global.co2Cycle = dryIce.co2Cycle;

global.evaporationRateMethane = hydrocarbon.evaporationRateMethane;
global.methaneCycle = hydrocarbon.methaneCycle;
global.boilingPointMethane = hydrocarbon.boilingPointMethane;
global.waterCycle = water.waterCycle;

global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;

const Terraforming = require('../src/js/terraforming.js');

function createResources() {
  return {
    atmospheric: {
      atmosphericWater: { value: 0, modifyRate: jest.fn() },
      carbonDioxide: { value: 0, modifyRate: jest.fn() },
      atmosphericMethane: { value: 0, modifyRate: jest.fn() },
    },
    surface: {
      liquidWater: { value: 0, modifyRate: jest.fn() },
      ice: { value: 0, modifyRate: jest.fn() },
      dryIce: { value: 0, modifyRate: jest.fn() },
      liquidMethane: { value: 0, modifyRate: jest.fn() },
      hydrocarbonIce: { value: 0, modifyRate: jest.fn() },
    },
    colony: {},
    special: { albedoUpgrades: { value: 0 } },
  };
}

test('updateResources calls cycle precipitation redistribution hooks', () => {
  const params = getPlanetParameters('titan');
  global.currentPlanetParameters = params;
  const res = createResources();
  global.resources = res;
  const terra = new Terraforming(res, params.celestialParameters);
  terra.calculateInitialValues(params);

  const waterSpy = jest.spyOn(water.waterCycle, 'redistributePrecipitation');
  const methaneSpy = jest.spyOn(hydrocarbon.methaneCycle, 'redistributePrecipitation');

  terra.updateResources(1000);

  expect(waterSpy).toHaveBeenCalled();
  expect(methaneSpy).toHaveBeenCalled();
});
