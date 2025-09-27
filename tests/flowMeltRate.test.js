const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const dryIce = require('../src/js/dry-ice-cycle.js');
const hydrology = require('../src/js/hydrology.js');
hydrology.simulateSurfaceWaterFlow = () => ({ totalMelt: 10, changes: {} });

// set up required globals for terraforming.js
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
global.co2Cycle = dryIce.co2Cycle;

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
      carbonDioxide: { value: 0, modifyRate: jest.fn() }
    },
    surface: {
      liquidWater: { value: 0, modifyRate: jest.fn() },
      ice: { value: 0, modifyRate: jest.fn() },
      dryIce: { value: 0, modifyRate: jest.fn() }
    },
    colony: {},
    special: { albedoUpgrades: { value: 0 } }
  };
}

describe('flow melt tracking', () => {
  test('updateResources counts melt from flow', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const res = createResources();
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues(params);

    // remove initial water to avoid other melt
    for (const z of ['tropical','temperate','polar']) {
      terra.zonalWater[z].liquid = 0;
      terra.zonalWater[z].ice = 0;
      terra.zonalWater[z].buriedIce = 0;
      terra.zonalCO2[z] = { liquid: 0, ice: 0 };
    }

    terra.updateResources(1000);

    expect(res.surface.liquidWater.modifyRate).toHaveBeenCalledWith(10, 'Flow Melt', 'terraforming');
    expect(res.surface.ice.modifyRate).toHaveBeenCalledWith(-10, 'Flow Melt', 'terraforming');
  });
});
