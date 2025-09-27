const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const { calculateAverageCoverage, calculateSurfaceFractions } = require('../src/js/terraforming-utils.js');

// Expose globals expected by terraforming module
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

const Terraforming = require('../src/js/terraforming.js');

function createResources(config) {
  const res = {};
  for (const cat in config) {
    res[cat] = {};
    for (const name in config[cat]) {
      const val = config[cat][name].initialValue || 0;
      res[cat][name] = { value: val };
    }
  }
  return res;
}


describe('initial planetary temperatures', () => {
  test.each(['mars', 'titan'])('initial temperature for %s', planet => {
    const params = getPlanetParameters(planet);
    global.currentPlanetParameters = params;
    global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };
    const res = createResources(params.resources);
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues(params);
    terra._updateZonalCoverageCache(); // Manually populate cache for test
    const initial = terra.temperature.value;
    terra.updateSurfaceTemperature();
    const recalculated = terra.temperature.value;
    expect(Math.abs(initial - recalculated)).toBeLessThan(2);
  });
});
