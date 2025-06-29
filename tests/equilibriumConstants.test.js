const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');

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
const phaseUtils = require('../src/js/phase-change-utils.js');
global.penmanRate = phaseUtils.penmanRate;
global.psychrometricConstant = phaseUtils.psychrometricConstant;
// water-cycle functions
const fs = require('fs');
eval(fs.readFileSync(require.resolve('../src/js/water-cycle.js'), 'utf8'));
global.saturationVaporPressureBuck = saturationVaporPressureBuck;
eval(fs.readFileSync(require.resolve('../src/js/dry-ice-cycle.js'), 'utf8'));
global.evaporationRateWater = evaporationRateWater;
global.sublimationRateWater = sublimationRateWater;
global.sublimationRateCO2 = sublimationRateCO2;

// Provide dummy buildings object
global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };

const Terraforming = require('../src/js/terraforming.js');
global.Terraforming = Terraforming;
require('../src/js/debug-tools.js');

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

    terra.updateResources(1000); // one tick

    const waterAfter = res.atmospheric.atmosphericWater.value;
    const co2After = res.atmospheric.carbonDioxide.value;

    expect(Number.isFinite(waterAfter)).toBe(true);
    expect(Number.isFinite(co2After)).toBe(true);
    expect(waterAfter).toBeGreaterThanOrEqual(0);
    expect(co2After).toBeGreaterThanOrEqual(0);
  });
});
