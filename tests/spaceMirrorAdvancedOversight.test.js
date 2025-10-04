global.Project = class {};
global.projectElements = {};
global.terraforming = { calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }) };
const originalFormatNumber = global.formatNumber;
const originalFormatBuildingCount = global.formatBuildingCount;
global.formatNumber = () => '';
global.formatBuildingCount = () => '';
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.document = dom.window.document;

const {
  SpaceMirrorFacilityProject,
  setMirrorDistribution,
  distributeAssignmentsFromSliders,
  toggleAdvancedOversight,
  resetMirrorOversightSettings,
  initializeMirrorOversightUI,
  updateMirrorOversightUI,
} = require('../src/js/projects/SpaceMirrorFacilityProject.js');

const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
const mirrorOversightSettings = project.mirrorOversightSettings;

// cleanup globals injected by module
delete global.Project;
delete global.projectElements;
delete global.terraforming;
delete global.calculateZoneSolarFluxWithFacility;
delete global.setMirrorDistribution;
delete global.resetMirrorOversightSettings;
delete global.initializeMirrorOversightUI;
delete global.updateMirrorOversightUI;
delete global.updateZonalFluxTable;
delete global.applyFocusedMelt;
delete global.toggleFinerControls;
delete global.updateAssignmentDisplays;
delete global.toggleAdvancedOversight;

describe('advanced mirror oversight', () => {
  beforeEach(() => {
    global.buildings = { spaceMirror: { active: 10 } };
    resetMirrorOversightSettings();
  });

  afterEach(() => {
    delete global.buildings;
  });

  afterAll(() => {
    if (originalFormatNumber !== undefined) global.formatNumber = originalFormatNumber;
    else delete global.formatNumber;
    if (originalFormatBuildingCount !== undefined) global.formatBuildingCount = originalFormatBuildingCount;
    else delete global.formatBuildingCount;
  });

  test('any zone assignments cleared when advanced oversight enabled', () => {
    setMirrorDistribution('any', 100);
    distributeAssignmentsFromSliders('mirrors');
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(10);
    toggleAdvancedOversight(true);
    distributeAssignmentsFromSliders('mirrors');
    expect(mirrorOversightSettings.assignments.mirrors.any).toBe(0);
  });

  test('advanced oversight tooltip clarifies priority order', () => {
    const container = document.createElement('div');
    initializeMirrorOversightUI(container);
    const tooltip = container.querySelector('#mirror-advanced-oversight-div .info-tooltip-icon');
    expect(tooltip).not.toBeNull();
    expect(tooltip.getAttribute('title')).toMatch(/lower numbers are assigned first/i);
  });

  test('disabling advanced oversight enables finer controls with existing assignments', () => {
    const container = document.body;
    container.innerHTML = '';
    initializeMirrorOversightUI(container);
    toggleAdvancedOversight(true);
    mirrorOversightSettings.assignments.mirrors = {
      tropical: 4,
      temperate: 6,
      polar: 0,
      focus: 0,
      unassigned: 0,
      any: 0,
    };
    toggleAdvancedOversight(false);
    updateMirrorOversightUI();
    expect(mirrorOversightSettings.useFinerControls).toBe(true);
    const finerBox = document.getElementById('mirror-use-finer');
    expect(finerBox.checked).toBe(true);
    expect(mirrorOversightSettings.assignments.mirrors.tropical).toBe(4);
    expect(mirrorOversightSettings.assignments.mirrors.temperate).toBe(6);
  });
});
