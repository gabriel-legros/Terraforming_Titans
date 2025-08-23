const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

global.Project = class {};
global.projectElements = {};
const {
  mirrorOversightSettings,
  toggleFinerControls,
  calculateZoneSolarFluxWithFacility
} = require('../src/js/projects/SpaceMirrorFacilityProject.js');

global.mirrorOversightSettings = mirrorOversightSettings;

global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;

global.resources = { atmospheric: {} };

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.calculateLanternFlux = function(){ return 0; };

function createTerraforming(){
  return new Terraforming({}, { radius: 1, distanceFromSun: 1, albedo: 0, gravity: 1 });
}

afterAll(() => {
  delete global.Project;
  delete global.projectElements;
  delete global.buildings;
  delete global.calculateZoneSolarFluxWithFacility;
  delete global.toggleFinerControls;
});

describe('Space Mirror finer controls', () => {
  test('enabling finer controls distributes assignments from sliders', () => {
    mirrorOversightSettings.distribution.tropical = 0.5;
    mirrorOversightSettings.distribution.temperate = 0.5;
    mirrorOversightSettings.distribution.polar = 0;
    mirrorOversightSettings.distribution.focus = 0;
    global.buildings = { spaceMirror: { active: 10 }, hyperionLantern: { active: 6 } };
    toggleFinerControls(true);
    expect(mirrorOversightSettings.assignments.mirrors.tropical).toBe(5);
    expect(mirrorOversightSettings.assignments.mirrors.temperate).toBe(5);
    expect(mirrorOversightSettings.assignments.lanterns.tropical).toBe(3);
    expect(mirrorOversightSettings.assignments.lanterns.temperate).toBe(3);
  });

  test('zone flux uses manual assignments', () => {
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 10 } };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.useFinerControls = true;
    mirrorOversightSettings.assignments.mirrors = { tropical: 10, temperate: 0, polar: 0, focus: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 0, focus: 0 };

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratioT = getZoneRatio('tropical') / 0.25;
    const zonePerc = getZonePercentage('tropical');
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const totalArea = terra.celestialParameters.surfaceArea;
    const focusedMirror = (4 * mirror.interceptedPower * 10) / (totalArea * zonePerc);
    const expected = (baseSolar + focusedMirror) * ratioT;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);

    const ratioTemp = getZoneRatio('temperate') / 0.25;
    const expectedTemp = baseSolar * ratioTemp;
    const resultTemp = terra.calculateZoneSolarFlux('temperate');
    expect(resultTemp).toBeCloseTo(expectedTemp, 5);
  });
});
