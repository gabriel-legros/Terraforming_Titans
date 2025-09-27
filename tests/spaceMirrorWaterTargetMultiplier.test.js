const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('space mirror water target multiplier', () => {
  test('applies multiplier and enlarges input', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    global.document = dom.window.document;
    global.getTemperatureUnit = () => 'K';
    global.formatNumber = v => v.toString();
    global.toDisplayTemperature = v => v;
    global.Project = class {};
    global.terraforming = { calculateZoneSolarFlux: () => 0 };

    const {
      SpaceMirrorFacilityProject,
      initializeMirrorOversightUI,
    } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
    const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
    const container = dom.window.document.getElementById('root');
    initializeMirrorOversightUI(container);

    const input = document.getElementById('adv-target-water');
    const select = document.getElementById('adv-target-water-scale');
    expect(input.style.width).toBe('75px');
    expect(select).not.toBeNull();

    select.value = '1000000';
    select.dispatchEvent(new dom.window.Event('change'));
    input.value = '2';
    input.dispatchEvent(new dom.window.Event('change'));
    expect(project.mirrorOversightSettings.targets.water).toBe(2000000);

    delete global.document;
    delete global.getTemperatureUnit;
    delete global.formatNumber;
    delete global.toDisplayTemperature;
    delete global.Project;
    delete global.terraforming;
    delete global.setMirrorDistribution;
    delete global.resetMirrorOversightSettings;
    delete global.initializeMirrorOversightUI;
    delete global.updateMirrorOversightUI;
    delete global.updateZonalFluxTable;
    delete global.applyFocusedMelt;
    delete global.calculateZoneSolarFluxWithFacility;
    delete global.toggleFinerControls;
    delete global.updateAssignmentDisplays;
    delete global.toggleAdvancedOversight;
    delete global.runAdvancedOversightAssignments;
  });
});
