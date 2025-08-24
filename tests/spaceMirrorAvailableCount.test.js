const numbers = require('../src/js/numbers.js');
const { JSDOM } = require('jsdom');
global.Project = class {};
global.projectElements = {};
const {
  initializeMirrorOversightUI,
  mirrorOversightSettings,
  resetMirrorOversightSettings,
  updateAssignmentDisplays
} = require('../src/js/projects/SpaceMirrorFacilityProject.js');

global.formatNumber = numbers.formatNumber;
global.formatBuildingCount = numbers.formatBuildingCount;

describe('space mirror available counts', () => {
  test('shows unassigned mirrors and lanterns', () => {
    resetMirrorOversightSettings();
    const dom = new JSDOM('<div id="container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    const container = document.getElementById('container');
    global.buildings = { spaceMirror: { active: 10 }, hyperionLantern: { active: 5 } };
    initializeMirrorOversightUI(container);
    mirrorOversightSettings.assignments.mirrors = { tropical: 3, temperate: 0, polar: 0, focus: 0, any: 0 };
    mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 2, focus: 0, any: 0 };
    updateAssignmentDisplays();
    expect(document.getElementById('available-mirrors').textContent).toBe('7');
    expect(document.getElementById('available-lanterns').textContent).toBe('3');
    delete global.window;
    delete global.document;
  });
});
