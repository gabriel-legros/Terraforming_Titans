const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
global.Project = class {};
global.projectElements = {};
const { SpaceMirrorFacilityProject } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
const mirrorOversightSettings = project.mirrorOversightSettings;
global.mirrorOversightSettings = mirrorOversightSettings;

// globals expected by terraforming.js
global.getZoneRatio = getZoneRatio;
global.getZonePercentage = getZonePercentage;
global.EffectableEntity = EffectableEntity;
global.lifeParameters = lifeParameters;
global.resources = { atmospheric: {} };

const Terraforming = require('../src/js/terraforming.js');

afterAll(() => {
  delete global.Project;
  delete global.projectElements;
  delete global.buildings;
  delete global.calculateZoneSolarFluxWithFacility;
  delete global.setMirrorDistribution;
  delete global.resetMirrorOversightSettings;
  delete global.initializeMirrorOversightUI;
  delete global.updateMirrorOversightUI;
  delete global.updateZonalFluxTable;
  delete global.applyFocusedMelt;
});

Terraforming.prototype.updateLuminosity = function(){};
Terraforming.prototype.updateSurfaceTemperature = function(){};
Terraforming.prototype.calculateLanternFlux = function(){ return 0; };

function createTerraforming() {
  return new Terraforming({}, { radius: 1, distanceFromSun: 1, albedo: 0, gravity: 1 });
}

describe('calculateZoneSolarFlux', () => {
  test('applies mirror distribution to selected zone', () => {
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 1 } };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.distribution.tropical = 0.5;
    mirrorOversightSettings.distribution.temperate = 0;
    mirrorOversightSettings.distribution.polar = 0;
    mirrorOversightSettings.distribution.focus = 0;
    mirrorOversightSettings.applyToLantern = false;

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratio = getZoneRatio('tropical') / 0.25;
    const zonePerc = getZonePercentage('tropical');
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const totalArea = terra.celestialParameters.surfaceArea;
    const distributedMirror = (4 * mirror.interceptedPower * 0.5 * buildings.spaceMirror.active) / totalArea;
    const focusedMirror = (4 * mirror.interceptedPower * 0.5 * buildings.spaceMirror.active) / (totalArea * zonePerc);
    const expected = (baseSolar + distributedMirror) * ratio + focusedMirror;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);
  });

  test('other zones receive only distributed mirrors', () => {
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 1 } };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.distribution.tropical = 0.5;
    mirrorOversightSettings.distribution.temperate = 0;
    mirrorOversightSettings.distribution.polar = 0;
    mirrorOversightSettings.distribution.focus = 0;
    mirrorOversightSettings.applyToLantern = false;

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratio = getZoneRatio('temperate') / 0.25;
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const totalArea = terra.celestialParameters.surfaceArea;
    const distributedMirror = (4 * mirror.interceptedPower * 0.5 * buildings.spaceMirror.active) / totalArea;
    const expected = (baseSolar + distributedMirror) * ratio;
    const result = terra.calculateZoneSolarFlux('temperate');
    expect(result).toBeCloseTo(expected, 5);
  });

  test('focus applies to lantern when enabled', () => {
    const terra = createTerraforming();
    global.buildings = {
      spaceMirror: { surfaceArea: 500, active: 1 },
      hyperionLantern: { active: 1, powerPerBuilding: 100 }
    };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.distribution.tropical = 0.5;
    mirrorOversightSettings.distribution.temperate = 0;
    mirrorOversightSettings.distribution.polar = 0;
    mirrorOversightSettings.distribution.focus = 0;
    mirrorOversightSettings.applyToLantern = true;

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
    const zonePerc = getZonePercentage('tropical');
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const lanternFlux = terra.calculateLanternFlux();
    const totalArea = terra.celestialParameters.surfaceArea;
    const areaFactor = terra.celestialParameters.crossSectionArea / totalArea;
    const distributedMirror = (4 * mirror.interceptedPower * 0.5 * buildings.spaceMirror.active) / totalArea;
    const focusedMirror = (4 * mirror.interceptedPower * 0.5 * buildings.spaceMirror.active) / (totalArea * zonePerc);
    const distributedLantern = 4 * lanternFlux * areaFactor * 0.5;
    const focusedLantern = 4 * lanternFlux * areaFactor * 0.5 / zonePerc;
    const expected = (baseSolar + distributedMirror + distributedLantern) * ratio + focusedMirror + focusedLantern;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);
  });

  test('unassigned slider leaves mirrors idle', () => {
    Terraforming.prototype.calculateLanternFlux = function(){ return 0; };
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 1 } };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: (id) => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.distribution.tropical = 0.5;
    mirrorOversightSettings.distribution.temperate = 0;
    mirrorOversightSettings.distribution.polar = 0;
    mirrorOversightSettings.distribution.focus = 0;
    mirrorOversightSettings.distribution.unassigned = 0.5;
    mirrorOversightSettings.applyToLantern = false;

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const totalArea = terra.celestialParameters.surfaceArea;
    const zonePerc = getZonePercentage('tropical');
    const ratioT = getZoneRatio('tropical') / 0.25;
    const ratioTemp = getZoneRatio('temperate') / 0.25;
    const focusedMirror = (4 * mirror.interceptedPower * 0.5 * buildings.spaceMirror.active) / (totalArea * zonePerc);
    const expectedTropical = baseSolar * ratioT + focusedMirror;
    const expectedTemperate = baseSolar * ratioTemp;

    const resultTropical = terra.calculateZoneSolarFlux('tropical');
    const resultTemperate = terra.calculateZoneSolarFlux('temperate');
    expect(resultTropical).toBeCloseTo(expectedTropical, 5);
    expect(resultTemperate).toBeCloseTo(expectedTemperate, 5);
  });
});
