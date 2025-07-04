const { getZoneRatio } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

// globals expected by terraforming.js
global.getZoneRatio = getZoneRatio;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;

const Terraforming = require('../src/js/terraforming.js');

Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.calculateLanternFlux = function(){ return 0; };

function createTerraforming() {
  return new Terraforming({}, { radius: 1, distanceFromSun: 1, albedo: 0, gravity: 1 });
}

describe('calculateZoneSolarFlux', () => {
  test('applies mirror oversight percentage to selected zone', () => {
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 1 } };
    global.projectManager = { isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight' };
    global.mirrorOversightSettings = { percentage: 0.5, zone: 'tropical' };

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratio = getZoneRatio('tropical') / 0.25;
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect().powerPerUnitArea * buildings.spaceMirror.active;
    const expected = (baseSolar + mirror * 0.5) * ratio + mirror * 0.5;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);
  });

  test('other zones receive only distributed mirrors', () => {
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 1 } };
    global.projectManager = { isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight' };
    global.mirrorOversightSettings = { percentage: 0.5, zone: 'tropical' };

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratio = getZoneRatio('temperate') / 0.25;
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect().powerPerUnitArea * buildings.spaceMirror.active;
    const expected = (baseSolar + mirror * 0.5) * ratio;
    const result = terra.calculateZoneSolarFlux('temperate');
    expect(result).toBeCloseTo(expected, 5);
  });
});
