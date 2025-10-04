const numbers = require('../src/js/numbers.js');
const { JSDOM } = require('jsdom');

global.Project = class {};
global.projectElements = {};
global.formatNumber = numbers.formatNumber;
global.formatBuildingCount = numbers.formatBuildingCount;

const {
  SpaceMirrorFacilityProject,
  toggleFinerControls,
  initializeMirrorOversightUI,
  resetMirrorOversightSettings
} = require('../src/js/projects/SpaceMirrorFacilityProject.js');

const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
const mirrorOversightSettings = project.mirrorOversightSettings;
global.mirrorOversightSettings = mirrorOversightSettings;

afterAll(() => {
  delete global.Project;
  delete global.projectElements;
  delete global.formatNumber;
  delete global.formatBuildingCount;
});

beforeEach(() => {
  resetMirrorOversightSettings();
});

describe('Space Mirror column step controls', () => {
  test('shows controls for mirrors and lanterns when lanterns available', () => {
    const dom = new JSDOM('<div id="container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    const container = document.getElementById('container');
    global.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { active: 0, unlocked: true } };
    initializeMirrorOversightUI(container);
    toggleFinerControls(true);
    const mirrorCell = container.querySelector('.available-mirror-cell');
    const lanternCell = container.querySelector('.available-lantern-cell');
    expect(mirrorCell.querySelector('.assignment-div10')).not.toBeNull();
    expect(mirrorCell.querySelector('.assignment-mul10')).not.toBeNull();
    expect(lanternCell.style.display).not.toBe('none');
    delete global.window;
    delete global.document;
  });

  test('hides lantern step controls when lanterns locked', () => {
    const dom = new JSDOM('<div id="container"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    const container = document.getElementById('container');
    global.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { active: 0, unlocked: false } };
    initializeMirrorOversightUI(container);
    toggleFinerControls(true);
    const lanternCell = container.querySelector('.available-lantern-cell');
    expect(lanternCell.style.display).toBe('none');
    delete global.window;
    delete global.document;
  });
});
