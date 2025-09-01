const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const { calculateAverageCoverage, calculateSurfaceFractions, calculateZonalSurfaceFractions } = require('../src/js/terraforming-utils.js');

// Preserve originals to restore after tests
const oldGetZoneRatio = global.getZoneRatio;
const oldGetZonePercentage = global.getZonePercentage;
const oldEffectableEntity = global.EffectableEntity;
const oldLifeParameters = global.lifeParameters;
const oldProjectManager = global.projectManager;
const oldMirrorSettings = global.mirrorOversightSettings;
const oldCalcAtmPressure = global.calculateAtmosphericPressure;
const oldCalcEmissivity = global.calculateEmissivity;
const oldDayNightModel = global.dayNightTemperaturesModel;
const oldEffectiveTemp = global.effectiveTemp;
const oldSurfaceAlbedoMix = global.surfaceAlbedoMix;
const oldCalcAvgCoverage = global.calculateAverageCoverage;
const oldCalcSurfaceFractions = global.calculateSurfaceFractions;
const oldCalcZonalSurfaceFractions = global.calculateZonalSurfaceFractions;

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
global.calculateAverageCoverage = calculateAverageCoverage;
global.calculateSurfaceFractions = calculateSurfaceFractions;
global.calculateZonalSurfaceFractions = calculateZonalSurfaceFractions;

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

describe('calculateInitialValues', () => {
  test('sets initialSolarFlux for delta calculations', () => {
    const params = getPlanetParameters('mars');
    global.currentPlanetParameters = params;
    global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 }, hyperionLantern: { active: 0 } };
    const res = createResources(params.resources);
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues(params);
    expect(terra.luminosity.initialSolarFlux).toBeCloseTo(terra.luminosity.modifiedSolarFlux, 5);
  });

  afterAll(() => {
    global.getZoneRatio = oldGetZoneRatio;
    global.getZonePercentage = oldGetZonePercentage;
    global.EffectableEntity = oldEffectableEntity;
    global.lifeParameters = oldLifeParameters;
    global.projectManager = oldProjectManager;
    global.mirrorOversightSettings = oldMirrorSettings;
    global.calculateAtmosphericPressure = oldCalcAtmPressure;
    global.calculateEmissivity = oldCalcEmissivity;
    global.dayNightTemperaturesModel = oldDayNightModel;
    global.effectiveTemp = oldEffectiveTemp;
    global.surfaceAlbedoMix = oldSurfaceAlbedoMix;
    global.calculateAverageCoverage = oldCalcAvgCoverage;
    global.calculateSurfaceFractions = oldCalcSurfaceFractions;
    global.calculateZonalSurfaceFractions = oldCalcZonalSurfaceFractions;
    delete global.buildings;
    delete global.resources;
    delete global.currentPlanetParameters;
  });
});

