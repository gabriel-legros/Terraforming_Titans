const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const physics = require('../src/js/physics.js');
const { calculateZonalSurfaceFractions } = require('../src/js/terraforming-utils.js');

// Expose globals expected by terraforming module
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.projectManager = { projects: { spaceMirrorFacility: { isBooleanFlagSet: () => false } }, isBooleanFlagSet: () => false };
global.mirrorOversightSettings = {};
// physics helpers expected globally
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

const EXPECTED_TEMPS = {
  mars: 226.223159098033,
  titan: 93.59612929341068
};

describe('initial average temperature using physics.js', () => {
  test.each(Object.keys(EXPECTED_TEMPS))('initial temperature for %s', planet => {
    const params = getPlanetParameters(planet);
    global.currentPlanetParameters = params;
    global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 } };
    const res = createResources(params.resources);
    global.resources = res;
    const terra = new Terraforming(res, params.celestialParameters);
    terra.calculateInitialValues(params);
    terra._updateZonalCoverageCache();

    const groundAlbedo = terra.luminosity.groundAlbedo;
    const rotationPeriod = params.celestialParameters.rotationPeriod || 24;
    const gSurface = params.celestialParameters.gravity;
    const { composition, totalMass } = terra.calculateAtmosphericComposition();
    const surfacePressurePa = physics.calculateAtmosphericPressure(totalMass / 1000, gSurface, params.celestialParameters.radius);
    const surfacePressureBar = surfacePressurePa / 100000;

    let calculated = 0;
    for (const zone in terra.temperature.zones) {
      const zoneFlux = terra.calculateZoneSolarFlux(zone);
      const fractions = calculateZonalSurfaceFractions(terra, zone);
      const temps = physics.dayNightTemperaturesModel({
        groundAlbedo,
        flux: zoneFlux,
        rotationPeriodH: rotationPeriod,
        surfacePressureBar,
        composition,
        gSurface,
        surfaceFractions: fractions
      });
      calculated += temps.mean * getZonePercentage(zone);
    }
    expect(Math.abs(calculated - EXPECTED_TEMPS[planet])).toBeLessThan(2);
  });
});

