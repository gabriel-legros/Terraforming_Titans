const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');

global.Project = class {};
global.projectElements = {};
const { mirrorOversightSettings } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
global.mirrorOversightSettings = mirrorOversightSettings;

global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.resources = { atmospheric: {} };

const Terraforming = require('../src/js/terraforming.js');
Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};

function createTerraforming(){
  return new Terraforming({}, { radius: 1, distanceFromSun: 1, albedo: 0, gravity: 1 });
}

afterEach(() => {
  mirrorOversightSettings.distribution.tropical = 0;
  mirrorOversightSettings.distribution.temperate = 0;
  mirrorOversightSettings.distribution.polar = 0;
  mirrorOversightSettings.distribution.focus = 0;
  mirrorOversightSettings.applyToLantern = false;
  delete global.buildings;
  delete global.projectManager;
});

afterAll(() => {
  delete global.Project;
  delete global.projectElements;
  delete global.mirrorOversightSettings;
  delete global.calculateZoneSolarFluxWithFacility;
  delete global.setMirrorDistribution;
  delete global.resetMirrorOversightSettings;
  delete global.initializeMirrorOversightUI;
  delete global.updateMirrorOversightUI;
  delete global.updateZonalFluxTable;
  delete global.applyFocusedMelt;
});

describe('space mirror reversal', () => {
  test('reversal subtracts mirror flux but leaves lantern flux', () => {
    const terra = createTerraforming();
    global.buildings = {
      spaceMirror: { surfaceArea: 1, active: 1 },
      hyperionLantern: { active: 1, powerPerBuilding: 100 }
    };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight', reverseEnabled: true } },
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.distribution.tropical = 0.5;
    mirrorOversightSettings.applyToLantern = true;

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratio = getZoneRatio('tropical') / 0.25;
    const zonePerc = getZonePercentage('tropical');
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const totalMirrorPower = mirror.interceptedPower * buildings.spaceMirror.active;
    const totalLanternPower = buildings.hyperionLantern.powerPerBuilding * buildings.hyperionLantern.active;
    const totalArea = terra.celestialParameters.surfaceArea;
    const zoneArea = totalArea * zonePerc;

    const distributedMirrorFlux = -4 * totalMirrorPower * 0.5 / totalArea;
    const focusedMirrorFlux = -4 * totalMirrorPower * 0.5 / zoneArea;
    const distributedLanternFlux = 4 * totalLanternPower * 0.5 / totalArea;
    const focusedLanternFlux = 4 * totalLanternPower * 0.5 / zoneArea;

    const expected = (baseSolar + distributedMirrorFlux + focusedMirrorFlux + distributedLanternFlux + focusedLanternFlux) * ratio;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);
  });

  test('zone flux floors at 24 microWatts per m^2', () => {
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 100, active: 10 } };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight', reverseEnabled: true } },
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight'
    };
    terra.luminosity.solarFlux = 0;

    const result = terra.calculateZoneSolarFlux('tropical');
    // Facility zone flux calculator floors at 2.4e-5 W/m^2
    expect(result).toBeCloseTo(2.4e-5, 10);
  });
});
