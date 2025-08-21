const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const dryIce = require('../src/js/dry-ice-cycle.js');
const hydrocarbon = require('../src/js/hydrocarbon-cycle.js');

jest.mock('../src/js/hydrology.js', () => {
  const original = jest.requireActual('../src/js/hydrology.js');
  const mockMethaneRates = jest.fn((...args) => {
    const coverageFn = args[5];
    mockMethaneRates.coverageValue = coverageFn ? coverageFn() : undefined;
    return { meltingRate: 0, freezingRate: 0 };
  });
  return {
    ...original,
    calculateMethaneMeltingFreezingRates: mockMethaneRates
  };
});
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
global.airDensity = physics.airDensity;

global.sublimationRateCO2 = dryIce.sublimationRateCO2;
global.calculateCO2CondensationRateFactor = dryIce.calculateCO2CondensationRateFactor;

global.evaporationRateMethane = hydrocarbon.evaporationRateMethane;
global.calculateMethaneCondensationRateFactor = hydrocarbon.calculateMethaneCondensationRateFactor;

global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;

const Terraforming = require('../src/js/terraforming.js');

// dummy buildings
global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };

function createResources() {
  return {
    atmospheric: {
      atmosphericWater: { value: 0, modifyRate: jest.fn() },
      carbonDioxide: { value: 0, modifyRate: jest.fn() },
      atmosphericMethane: { value: 0, modifyRate: jest.fn() }
    },
    surface: {
      liquidWater: { value: 0, modifyRate: jest.fn() },
      ice: { value: 0, modifyRate: jest.fn() },
      dryIce: { value: 0, modifyRate: jest.fn() },
      liquidMethane: { value: 100, modifyRate: jest.fn() },
      hydrocarbonIce: { value: 0, modifyRate: jest.fn() }
    },
    colony: {},
    special: { albedoUpgrades: { value: 0 } }
  };
}

describe('methane atmospheric rate tracking', () => {
  test('updateResources tracks methane evaporation and condensation', () => {
    const params = getPlanetParameters('titan');
    global.currentPlanetParameters = params;
    const res = createResources();
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues(params);

    // ensure some methane in atmosphere so condensation path runs
    res.atmospheric.atmosphericMethane.value = 50;

    terra.updateResources(1000);

    const calls = res.atmospheric.atmosphericMethane.modifyRate.mock.calls;
    const labels = calls.map(c => c[1]);
    expect(labels).toContain('Evaporation/Sublimation');
    expect(labels).toContain('Precipitation');
  });
});

describe('methane melting/freezing coverage', () => {
  test('passes methane ice coverage function', () => {
    const params = getPlanetParameters('titan');
    global.currentPlanetParameters = params;
    const res = createResources();
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);

    terra._updateZonalCoverageCache = function () {
      for (const z of ['tropical', 'temperate', 'polar']) {
        this.zonalCoverageCache[z] = { hydrocarbonIce: 0.25, liquidMethane: 0 };
      }
    };

    terra.calculateInitialValues(params);
    terra.updateResources(1000);

    expect(hydrology.calculateMethaneMeltingFreezingRates.coverageValue).toBeCloseTo(0.25);
  });
});
