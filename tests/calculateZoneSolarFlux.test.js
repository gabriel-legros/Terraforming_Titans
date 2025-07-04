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
    global.mirrorOversightSettings = { percentage: 0.5, zone: 'tropical', applyToLantern: false };

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
    global.mirrorOversightSettings = { percentage: 0.5, zone: 'tropical', applyToLantern: false };

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratio = getZoneRatio('temperate') / 0.25;
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect().powerPerUnitArea * buildings.spaceMirror.active;
    const expected = (baseSolar + mirror * 0.5) * ratio;
    const result = terra.calculateZoneSolarFlux('temperate');
    expect(result).toBeCloseTo(expected, 5);
  });

  test('focus applies to lantern when enabled', () => {
    const terra = createTerraforming();
    global.buildings = {
      spaceMirror: { surfaceArea: 500, active: 1 },
      hyperionLantern: { active: 1, powerPerBuilding: 100 }
    };
    global.projectManager = { isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight' };
    global.mirrorOversightSettings = { percentage: 0.5, zone: 'tropical', applyToLantern: true };

    Terraforming.prototype.calculateLanternFlux = function(){
      const lantern = buildings.hyperionLantern;
      const area = this.celestialParameters.crossSectionArea || this.celestialParameters.surfaceArea;
      const productivity = typeof lantern.productivity === 'number' ? lantern.productivity : 1;
      return (lantern.powerPerBuilding || 0) * lantern.active * productivity / area;
    };

    terra.celestialParameters.crossSectionArea = Math.PI * 1000 * 1000;

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratio = getZoneRatio('tropical') / 0.25;
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect().powerPerUnitArea * buildings.spaceMirror.active;
    const lantern = terra.calculateLanternFlux();
    const expected = (baseSolar + mirror * 0.5 + lantern * 0.5) * ratio + mirror * 0.5 + lantern * 0.5;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);
  });
});
