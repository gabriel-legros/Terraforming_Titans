const numbers = require('../src/js/numbers.js');
const { JSDOM } = require('jsdom');

global.Project = class {};
global.projectElements = {};
global.formatNumber = numbers.formatNumber;
global.formatBuildingCount = numbers.formatBuildingCount;
global.toDisplayTemperature = numbers.toDisplayTemperature;
global.getTemperatureUnit = numbers.getTemperatureUnit;

const {
  SpaceMirrorFacilityProject,
  initializeMirrorOversightUI,
  updateMirrorOversightUI,
  toggleFinerControls,
  resetMirrorOversightSettings
} = require('../src/js/projects/SpaceMirrorFacilityProject.js');

const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
const mirrorOversightSettings = project.mirrorOversightSettings;
global.mirrorOversightSettings = mirrorOversightSettings;

describe('space mirror unassigned slider ui', () => {
  beforeEach(() => {
    resetMirrorOversightSettings();
  });

  test('shows hidden reversal placeholder for consistent width', () => {
    const dom = new JSDOM('<div id="container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { active: 0, unlocked: false } };
    global.projectManager = {
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight',
      projects: { spaceMirrorFacility: { isBooleanFlagSet: () => true, reversalAvailable: true } }
    };

    const container = document.getElementById('container');
    initializeMirrorOversightUI(container);
    updateMirrorOversightUI();

    const group = document.getElementById('mirror-oversight-unassigned').parentElement;
    const checkbox = group.querySelector('.slider-reversal-checkbox');
    const label = group.querySelector('.slider-reverse-label');
    expect(checkbox.style.display).toBe('');
    expect(label.style.display).toBe('');
    expect(checkbox.style.visibility).toBe('hidden');
    expect(label.style.visibility).toBe('hidden');
    expect(group.children.length).toBe(5);

    delete global.window;
    delete global.document;
    delete global.buildings;
    delete global.projectManager;
  });

  test('unassigned slider locks in finer controls mode', () => {
    const dom = new JSDOM('<div id="container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { active: 0, unlocked: false } };
    global.projectManager = { isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight' };

    const container = document.getElementById('container');
    initializeMirrorOversightUI(container);
    updateMirrorOversightUI();

    const slider = document.getElementById('mirror-oversight-unassigned');
    expect(slider.disabled).toBe(false);
    toggleFinerControls(true);
    expect(slider.disabled).toBe(true);

    delete global.window;
    delete global.document;
    delete global.buildings;
    delete global.projectManager;
  });
});
