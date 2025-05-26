const { getZoneRatio, getZonePercentage } = require('../zones.js');
const EffectableEntity = require('../effectable-entity.js');
const lifeParameters = require('../life-parameters.js');
const physics = require('../physics.js');

global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
// stub heavy physics functions
global.calculateAtmosphericPressure = () => 0;
global.calculateEmissivity = () => 0;
global.dayNightTemperaturesModel = () => ({mean:0, day:0, night:0});
global.effectiveTemp = () => 0;
global.surfaceAlbedoMix = () => 0;

global.buildings = { spaceMirror: { surfaceArea: 1e6, active: 1 } };
global.resources = { atmospheric:{}, special:{ albedoUpgrades:{ value:0 } } };

const Terraforming = require('../terraforming.js');
Terraforming.prototype.updateLuminosity = function() {};
Terraforming.prototype.updateSurfaceTemperature = function() {};

const AU_METER = 149597870700;

describe('Terraforming solar calculations', () => {
  test('calculateSolarFlux at 1 AU', () => {
    const terra = new Terraforming(global.resources, { radius: 1000, distanceFromSun: 1 });
    const expected = 3.828e26 / (4 * Math.PI * Math.pow(AU_METER, 2));
    expect(terra.calculateSolarFlux(AU_METER)).toBeCloseTo(expected, 5);
  });

  test('calculateMirrorEffect returns power values', () => {
    const terra = new Terraforming(global.resources, { radius: 1000, distanceFromSun: 1 });
    const baseFlux = terra.calculateSolarFlux(AU_METER);
    const effect = terra.calculateMirrorEffect();
    const intercepted = baseFlux * global.buildings.spaceMirror.surfaceArea;
    expect(effect.interceptedPower).toBeCloseTo(intercepted, 5);
    expect(effect.powerPerUnitArea).toBeCloseTo(intercepted / terra.celestialParameters.surfaceArea, 5);
  });

  test('calculateModifiedSolarFlux adds mirror contribution', () => {
    const terra = new Terraforming(global.resources, { radius: 1000, distanceFromSun: 1 });
    const base = terra.calculateSolarFlux(AU_METER);
    const mirror = terra.calculateMirrorEffect().powerPerUnitArea;
    expect(terra.calculateModifiedSolarFlux(AU_METER)).toBeCloseTo(base + mirror, 5);
  });

  test('calculateSolarPanelMultiplier uses modified flux', () => {
    const terra = new Terraforming(global.resources, { radius: 1000, distanceFromSun: 1 });
    terra.luminosity.modifiedSolarFlux = 2000;
    expect(terra.calculateSolarPanelMultiplier()).toBeCloseTo(2, 5);
  });

  test('calculateColonyEnergyPenalty reacts to temperature', () => {
    const terra = new Terraforming(global.resources, { radius: 1000, distanceFromSun: 1 });
    terra.temperature.zones.tropical.value = 295.15;
    terra.temperature.zones.temperate.value = 295.15;
    terra.temperature.zones.polar.value = 295.15;
    expect(terra.calculateColonyEnergyPenalty()).toBe(1);
    terra.temperature.zones.tropical.value = 305.15;
    terra.temperature.zones.temperate.value = 305.15;
    terra.temperature.zones.polar.value = 305.15;
    expect(terra.calculateColonyEnergyPenalty()).toBeCloseTo(2,5);
  });
});
