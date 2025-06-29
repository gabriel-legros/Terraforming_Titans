const { getPlanetParameters } = require('../planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../zones.js');
const EffectableEntity = require('../effectable-entity.js');
const lifeParameters = require('../life-parameters.js');
const physics = require('../physics.js');
const dryIce = require('../dry-ice-cycle.js');

// globals required by terraforming.js
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
global.calculateEmissivity = physics.calculateEmissivity;
global.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
global.effectiveTemp = physics.effectiveTemp;
global.surfaceAlbedoMix = physics.surfaceAlbedoMix;
global.airDensity = physics.airDensity;

global.sublimationRateCO2 = dryIce.sublimationRateCO2;
global.calculateCO2CondensationRateFactor = dryIce.calculateCO2CondensationRateFactor;
global.EQUILIBRIUM_CO2_PARAMETER = dryIce.EQUILIBRIUM_CO2_PARAMETER;

global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;

const Terraforming = require('../terraforming.js');

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

describe('surface melting distribution', () => {
  test('updateResources splits melt between surface and buried ice', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const res = createResources();
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.initialValuesCalculated = true;
    for (const z of ['tropical','temperate','polar']) {
      terra.temperature.zones[z].value = 280;
      terra.zonalWater[z].liquid = 0;
      terra.zonalWater[z].ice = 0;
      terra.zonalWater[z].buriedIce = 0;
      terra.zonalSurface[z] = { dryIce: 0 };
    }
    res.surface.liquidWater.value = 0;
    res.surface.ice.value = 0;

    terra.zonalWater.polar.ice = 100;
    terra.zonalWater.polar.buriedIce = 50;

    terra.updateResources(1000);

    const meltedIce = 100 - terra.zonalWater.polar.ice;
    const meltedBuried = 50 - terra.zonalWater.polar.buriedIce;
    const ratio = meltedIce / (meltedIce + meltedBuried);
    expect(ratio).toBeCloseTo(100 / 150, 2);
  });
});
