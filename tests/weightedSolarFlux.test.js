const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

// Globals required by terraforming.js
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
// Disable project flags
global.projectManager = { projects: {}, isBooleanFlagSet: () => false };
// No mirror oversight
global.mirrorOversightSettings = {};

// Stub physics functions used in updateSurfaceTemperature
global.calculateAtmosphericPressure = () => 0;
global.calculateEmissivity = () => 0;
global.dayNightTemperaturesModel = () => ({ mean: 0, day: 0, night: 0 });
global.effectiveTemp = () => 0;
// Used by calculateActualAlbedo via physics.js
global.calculateActualAlbedoPhysics = () => ({ albedo: 0 });
// Used by calculateZonalSurfaceFractions
global.calculateZonalSurfaceFractions = () => ({ ocean: 0, ice: 0, hydrocarbon: 0, hydrocarbonIce: 0, co2_ice: 0, biomass: 0 });

const Terraforming = require('../src/js/terraforming.js');

describe('weighted solar flux', () => {
  test('modifiedSolarFlux equals zonal weighted average', () => {
    global.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } } };
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 1 }, hyperionLantern: { active: 0 } };

    const tf = new Terraforming(global.resources, { radius: 1, distanceFromSun: 1, albedo: 0, gravity: 1 });
    tf.updateLuminosity();

    const zones = ['tropical','temperate','polar'];
    const expected = zones.reduce((sum, z) => sum + (tf.luminosity.zonalFluxes[z] || 0) * getZonePercentage(z), 0);
    expect(tf.luminosity.modifiedSolarFlux).toBeCloseTo(expected, 5);
  });
});
