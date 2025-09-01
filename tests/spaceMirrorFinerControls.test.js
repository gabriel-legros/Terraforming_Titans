const { getZoneRatio, getZonePercentage } = require('../src/js/zones.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
const lifeParameters = require('../src/js/life-parameters.js');
const numbers = require('../src/js/numbers.js');
const { JSDOM } = require('jsdom');

global.Project = class {};
global.projectElements = {};
global.formatNumber = numbers.formatNumber;
global.formatBuildingCount = numbers.formatBuildingCount;
global.toDisplayTemperature = numbers.toDisplayTemperature;
global.getTemperatureUnit = numbers.getTemperatureUnit;
const {
  mirrorOversightSettings,
  toggleFinerControls,
  calculateZoneSolarFluxWithFacility,
  distributeAssignmentsFromSliders,
  distributeAutoAssignments,
  resetMirrorOversightSettings,
  initializeMirrorOversightUI,
  updateMirrorOversightUI
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
    resetMirrorOversightSettings();
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
    resetMirrorOversightSettings();
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 10 } };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.useFinerControls = true;
    mirrorOversightSettings.assignments.mirrors = { tropical: 10, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 };

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const ratioT = getZoneRatio('tropical') / 0.25;
    const zonePerc = getZonePercentage('tropical');
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const totalArea = terra.celestialParameters.surfaceArea;
    const focusedMirror = (4 * mirror.interceptedPower * 10) / (totalArea * zonePerc);
    const expected = baseSolar * ratioT + focusedMirror;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);

    const ratioTemp = getZoneRatio('temperate') / 0.25;
    const expectedTemp = baseSolar * ratioTemp;
    const resultTemp = terra.calculateZoneSolarFlux('temperate');
    expect(resultTemp).toBeCloseTo(expectedTemp, 5);
  });

  test('unassigned units produce no luminosity', () => {
    resetMirrorOversightSettings();
    const terra = createTerraforming();
    global.buildings = {
      spaceMirror: { surfaceArea: 500, active: 10 },
      hyperionLantern: { active: 6, powerPerBuilding: 100, productivity: 1 }
    };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.useFinerControls = true;
    mirrorOversightSettings.assignments.mirrors = { tropical: 5, temperate: 0, polar: 0, focus: 0, unassigned: 5, any: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 3, temperate: 0, polar: 0, focus: 0, unassigned: 3, any: 0 };

    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);

    const baseSolar = terra.luminosity.solarFlux;
    const ratioTemp = getZoneRatio('temperate') / 0.25;
    const expectedTemp = baseSolar * ratioTemp;
    const resultTemp = terra.calculateZoneSolarFlux('temperate');
    expect(resultTemp).toBeCloseTo(expectedTemp, 5);
  });

  test('lantern assignment section hidden when lantern locked', () => {
    resetMirrorOversightSettings();
    const dom = new JSDOM('<div id="container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    const container = document.getElementById('container');
    global.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { active: 0, unlocked: false } };
    global.projectManager = {
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight'
    };
    initializeMirrorOversightUI(container);
    updateMirrorOversightUI();
    const cell = container.querySelector('#assignment-grid .assign-cell[data-type="lanterns"]');
    expect(cell.style.display).toBe('none');
    delete global.window;
    delete global.document;
  });

  test('auto-assign zones distributes remaining units', () => {
    resetMirrorOversightSettings();
    mirrorOversightSettings.assignments.mirrors = { tropical: 0, temperate: 0, polar: 0, focus: 3, unassigned: 0, any: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 0, focus: 1, unassigned: 0, any: 0 };
    mirrorOversightSettings.autoAssign.tropical = true;
    mirrorOversightSettings.autoAssign.temperate = true;
    global.buildings = { spaceMirror: { active: 10 }, hyperionLantern: { active: 6 } };
    distributeAutoAssignments('mirrors');
    distributeAutoAssignments('lanterns');
    expect(mirrorOversightSettings.assignments.mirrors).toEqual({ tropical: 4, temperate: 3, polar: 0, focus: 3, unassigned: 0, any: 0 });
    expect(mirrorOversightSettings.assignments.lanterns).toEqual({ tropical: 3, temperate: 2, polar: 0, focus: 1, unassigned: 0, any: 0 });
  });

  test('auto-assign focus distributes remaining units', () => {
    resetMirrorOversightSettings();
    mirrorOversightSettings.assignments.mirrors = { tropical: 4, temperate: 3, polar: 0, focus: 0, unassigned: 0, any: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 3, temperate: 2, polar: 0, focus: 0, unassigned: 0, any: 0 };
    mirrorOversightSettings.autoAssign.focus = true;
    global.buildings = { spaceMirror: { active: 10 }, hyperionLantern: { active: 6 } };
    distributeAutoAssignments('mirrors');
    distributeAutoAssignments('lanterns');
    expect(mirrorOversightSettings.assignments.mirrors.focus).toBe(3);
    expect(mirrorOversightSettings.assignments.lanterns.focus).toBe(1);
    expect(mirrorOversightSettings.assignments.mirrors.tropical).toBe(4);
    expect(mirrorOversightSettings.assignments.lanterns.temperate).toBe(2);
  });

  test('auto-assign any zone uses slider percentage', () => {
    resetMirrorOversightSettings();
    mirrorOversightSettings.distribution.tropical = 0.3;
    mirrorOversightSettings.distribution.temperate = 0.2;
    mirrorOversightSettings.distribution.polar = 0.1;
    mirrorOversightSettings.distribution.focus = 0;
    mirrorOversightSettings.assignments.mirrors = { tropical: 3, temperate: 2, polar: 1, focus: 0, unassigned: 0, any: 0 };
    mirrorOversightSettings.autoAssign.any = true;
    global.buildings = { spaceMirror: { active: 10 }, hyperionLantern: { active: 0 } };
    distributeAutoAssignments('mirrors');
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(4);
  });

  test('manual controls adjust any zone assignments', () => {
    resetMirrorOversightSettings();
    const dom = new JSDOM('<div id="container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    const container = document.getElementById('container');
    global.buildings = { spaceMirror: { active: 10 }, hyperionLantern: { active: 0 } };
    initializeMirrorOversightUI(container);
    toggleFinerControls(true);
    const minusBtn = container.querySelector('#assignment-grid .assign-cell[data-type="mirrors"][data-zone="any"] .assign-minus');
    const plusBtn = container.querySelector('#assignment-grid .assign-cell[data-type="mirrors"][data-zone="any"] .assign-plus');
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(10);
    minusBtn.click();
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(9);
    plusBtn.click();
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(10);
    delete global.window;
    delete global.document;
  });

  test('any zone assignments add global flux', () => {
    resetMirrorOversightSettings();
    const terra = createTerraforming();
    global.buildings = { spaceMirror: { surfaceArea: 500, active: 10 } };
    global.projectManager = {
      projects: { spaceMirrorFacility: { isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight' } },
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight'
    };
    mirrorOversightSettings.useFinerControls = true;
    mirrorOversightSettings.assignments.mirrors = { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 10 };
    terra.luminosity.solarFlux = terra.calculateSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    terra.luminosity.modifiedSolarFlux = terra.calculateModifiedSolarFlux(terra.celestialParameters.distanceFromSun * 149597870700);
    const ratio = getZoneRatio('tropical') / 0.25;
    const baseSolar = terra.luminosity.solarFlux;
    const mirror = terra.calculateMirrorEffect();
    const distributedFlux = (4 * mirror.interceptedPower * 10) / terra.celestialParameters.surfaceArea;
    const expected = (baseSolar + distributedFlux) * ratio;
    const result = terra.calculateZoneSolarFlux('tropical');
    expect(result).toBeCloseTo(expected, 5);
  });
});
