const { getPlanetParameters } = require('../planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../zones.js');
const EffectableEntity = require('../effectable-entity.js');
const lifeParameters = require('../life-parameters.js');
const physics = require('../physics.js');

// globals expected by terraforming.js
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
// constants used by cycle utilities
global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;
// water-cycle functions
const fs = require('fs');
eval(fs.readFileSync(require.resolve('../water-cycle.js'), 'utf8'));
global.saturationVaporPressureBuck = saturationVaporPressureBuck;
eval(fs.readFileSync(require.resolve('../dry-ice-cycle.js'), 'utf8'));
global.evaporationRateWater = evaporationRateWater;
global.sublimationRateWater = sublimationRateWater;
global.sublimationRateCO2 = sublimationRateCO2;

// Provide dummy buildings object
global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };

const Terraforming = require('../terraforming.js');

function createResources(config) {
  const res = {};
  for (const cat in config) {
    res[cat] = {};
    for (const name in config[cat]) {
      const val = config[cat][name].initialValue || 0;
      res[cat][name] = { value: val, modifyRate: () => {} };
    }
  }
  return res;
}

describe('equilibrium constants', () => {
  test('updateResources conserves atmospheric mass when using calculated constants', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    const res = createResources(params.resources);
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues();
    terra.calculateEquilibriumConstants();

    const beforeWater = res.atmospheric.atmosphericWater.value;
    const beforeCo2 = res.atmospheric.carbonDioxide.value;

    terra.updateResources(1000); // one tick

    expect(res.atmospheric.atmosphericWater.value).toBeCloseTo(beforeWater, 5);
    expect(res.atmospheric.carbonDioxide.value).toBeCloseTo(beforeCo2, 5);
  });
});
