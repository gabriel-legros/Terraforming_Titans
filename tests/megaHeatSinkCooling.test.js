const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
global.mirrorOversightSettings = {};

global.calculateAtmosphericPressure = () => 0;
global.calculateEmissivity = () => ({ emissivity: 1, tau: 1e12, contributions: {} });
global.dayNightTemperaturesModel = () => ({
  mean: 280,
  day: 280,
  night: 280,
  equilibriumTemperature: 280,
  albedo: 0
});
global.autoSlabHeatCapacity = () => 10;
global.effectiveTemp = () => 0;
global.calculateZonalSurfaceFractions = () => ({
  ocean: 0,
  ice: 0,
  hydrocarbon: 0,
  hydrocarbonIce: 0,
  co2_ice: 0,
  biomass: 0
});

global.resources = {
  atmospheric: {},
  special: { albedoUpgrades: { value: 0 } }
};

global.buildings = { spaceMirror: { surfaceArea: 0, active: 0 }, hyperionLantern: { active: 0 } };

const Terraforming = require('../src/js/terraforming.js');

function runWithHeatSinks(count) {
  global.projectManager.projects.megaHeatSink = { repeatCount: count };

  const tf = new Terraforming(global.resources, {
    radius: 100,
    distanceFromSun: 1,
    albedo: 0,
    gravity: 1
  });

  tf.calculateZoneSolarFlux = () => 0;

  for (const zone of ['tropical', 'temperate', 'polar']) {
    tf.temperature.zones[zone].value = 300;
    tf.temperature.zones[zone].day = 300;
    tf.temperature.zones[zone].night = 300;
  }

  tf.updateSurfaceTemperature(1000);
  return tf.temperature.zones.tropical.value;
}

describe('Mega Heat Sink cooling', () => {
  afterEach(() => {
    delete global.projectManager.projects.megaHeatSink;
  });

  test('heat sinks accelerate cooling toward the trend temperature', () => {
    const baseline = runWithHeatSinks(0);
    const cooled = runWithHeatSinks(3);

    expect(baseline).toBeGreaterThan(cooled);
    expect(cooled).toBeLessThan(300);
  });
});
