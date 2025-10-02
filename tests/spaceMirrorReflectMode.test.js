const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('space mirror reflect mode', () => {
  test('enableReversal shows slider reversal checkboxes', () => {
    const originalDocument = global.document;
    const originalProject = global.Project;
    const originalFormat = global.formatNumber;
    const originalTerraforming = global.terraforming;
    const originalBuildings = global.buildings;
    const originalProjectElements = global.projectElements;

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
    global.updateZonalFluxTable = () => {};

    const { SpaceMirrorFacilityProject } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
    const config = { name: 'Space Mirror Facility', cost: {}, duration: 0 };
    const project = new SpaceMirrorFacilityProject(config, 'spaceMirrorFacility');
    global.projectManager = { projects: { spaceMirrorFacility: project }, isBooleanFlagSet: () => false };
    project.enableReversal();

    const container = document.getElementById('root');
    project.renderUI(container);
    project.updateUI();

    const checkbox = dom.window.document.getElementById('mirror-oversight-tropical-reverse');
    expect(checkbox).not.toBeNull();
    expect(checkbox.style.display).not.toBe('none');
    checkbox.click();
    expect(project.mirrorOversightSettings.assignments.reversalMode.tropical).toBe(true);

    global.document = originalDocument;
    global.Project = originalProject;
    global.formatNumber = originalFormat;
    global.terraforming = originalTerraforming;
    global.buildings = originalBuildings;
    global.projectElements = originalProjectElements || {};
    delete global.projectManager;
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
