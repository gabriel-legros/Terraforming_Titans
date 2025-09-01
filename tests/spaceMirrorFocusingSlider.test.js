const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

const originalProject = global.Project;
const originalProjectElements = global.projectElements;
const originalBuildings = global.buildings;
const originalTerraforming = global.terraforming;
const originalFormatNumber = global.formatNumber;

global.Project = class {};
global.projectElements = {};
global.buildings = {};
global.terraforming = { calculateZoneSolarFlux: () => 0 };
global.formatNumber = () => '';

const { SpaceMirrorFacilityProject, initializeMirrorOversightUI, updateMirrorOversightUI } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');

afterAll(() => {
  global.Project = originalProject;
  global.projectElements = originalProjectElements;
  global.buildings = originalBuildings;
  global.terraforming = originalTerraforming;
  global.formatNumber = originalFormatNumber;
});

test('focus slider visibility toggles with flag', () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>');
  const originalDoc = global.document;
  const originalProjectManager = global.projectManager;

  global.document = dom.window.document;

  const flags = new Set(['spaceMirrorFacilityOversight']);
  global.projectManager = {
    isBooleanFlagSet: id => flags.has(id),
    projects: { spaceMirrorFacility: { isBooleanFlagSet: id => flags.has(id) } }
  };

  const container = document.getElementById('container');
  initializeMirrorOversightUI(container);

  updateMirrorOversightUI();
  const group = document.getElementById('mirror-oversight-focus-group');
  expect(group.style.display).toBe('none');

  flags.add('spaceMirrorFocusing');
  updateMirrorOversightUI();
  expect(group.style.display).toBe('flex');

  global.document = originalDoc;
  global.projectManager = originalProjectManager;
});
