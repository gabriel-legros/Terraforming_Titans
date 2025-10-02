const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('space mirror reversal column', () => {
  test('reversal column hidden until reversal enabled', () => {
    const originalDocument = global.document;
    const originalProject = global.Project;
    const originalFormat = global.formatNumber;
    const originalTerraforming = global.terraforming;
    const originalBuildings = global.buildings;
    const originalProjectElements = global.projectElements;
    const originalProjectManager = global.projectManager;

    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    global.document = dom.window.document;
    global.Project = class {
      saveState() { return {}; }
      loadState() {}
    };
    global.formatNumber = v => v;
    global.terraforming = {
      calculateMirrorEffect: () => ({ interceptedPower: 0, powerPerUnitArea: 0 }),
      celestialParameters: { crossSectionArea: 1, surfaceArea: 1 },
    };
    global.buildings = { spaceMirror: { active: 0 }, hyperionLantern: { unlocked: false } };
    global.projectElements = {};

    const { SpaceMirrorFacilityProject } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
    const config = { name: 'Space Mirror Facility', cost: {}, duration: 0 };
    const project = new SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    global.projectManager = {
      projects: { spaceMirrorFacility: project },
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight',
    };

    const container = document.getElementById('root');
    project.renderUI(container);
    project.updateUI();

    const header = document.querySelector('#assignment-grid .grid-header:nth-child(4)');
    const cells = Array.from(document.querySelectorAll('#assignment-grid .grid-reversal-cell'));
    expect(header.style.display).toBe('none');
    cells.forEach(cell => {
      expect(cell.style.display).toBe('none');
    });

    project.enableReversal();
    project.updateUI();

    expect(header.style.display).not.toBe('none');
    cells.forEach(cell => {
      if (cell.dataset.zone === 'focus') return;
      expect(cell.style.display).not.toBe('none');
    });

    global.document = originalDocument;
    global.Project = originalProject;
    global.formatNumber = originalFormat;
    global.terraforming = originalTerraforming;
    global.buildings = originalBuildings;
    global.projectElements = originalProjectElements || {};
    global.projectManager = originalProjectManager;
    delete global.setMirrorDistribution;
    delete global.resetMirrorOversightSettings;
    delete global.initializeMirrorOversightUI;
    delete global.updateMirrorOversightUI;
    delete global.updateZonalFluxTable;
    delete global.applyFocusedMelt;
    delete global.calculateZoneSolarFluxWithFacility;
    delete global.toggleFinerControls;
    delete global.updateAssignmentDisplays;
  });
});

