const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('space mirror focus reversal', () => {
  test('focus zone uses hidden reversal placeholder', () => {
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
      isBooleanFlagSet: id => id === 'spaceMirrorFacilityOversight' || id === 'spaceMirrorFocusing',
    };

    const container = document.getElementById('root');
    project.renderUI(container);
    project.updateUI();

    const sliderBox = container.querySelector('#mirror-oversight-focus-reverse');
    const sliderLabel = container.querySelector('label[for="mirror-oversight-focus-reverse"]');
    expect(sliderBox).not.toBeNull();
    expect(sliderLabel).not.toBeNull();
    expect(sliderBox.style.display).toBe('none');
    expect(sliderLabel.style.display).toBe('none');
    expect(sliderBox.style.visibility).toBe('hidden');
    expect(sliderLabel.style.visibility).toBe('hidden');
    const revCell = container.querySelector('#assignment-grid .grid-reversal-cell[data-zone="focus"]');
    expect(revCell).not.toBeNull();
    expect(revCell.style.display).toBe('none');
    const hiddenBox = revCell.querySelector('input.reversal-checkbox');
    expect(hiddenBox).not.toBeNull();
    expect(hiddenBox.style.visibility).toBe('hidden');

    project.enableReversal();
    project.updateUI();

    const sliderBox2 = container.querySelector('#mirror-oversight-focus-reverse');
    const sliderLabel2 = container.querySelector('label[for="mirror-oversight-focus-reverse"]');
    expect(sliderBox2).not.toBeNull();
    expect(sliderLabel2).not.toBeNull();
    expect(sliderBox2.style.display).toBe('');
    expect(sliderLabel2.style.display).toBe('');
    expect(sliderBox2.style.visibility).toBe('hidden');
    expect(sliderLabel2.style.visibility).toBe('hidden');
    const revCell2 = container.querySelector('#assignment-grid .grid-reversal-cell[data-zone="focus"]');
    expect(revCell2).not.toBeNull();
    expect(revCell2.style.display).toBe('flex');
    const hiddenBox2 = revCell2.querySelector('input.reversal-checkbox');
    expect(hiddenBox2).not.toBeNull();
    expect(hiddenBox2.style.visibility).toBe('hidden');

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

