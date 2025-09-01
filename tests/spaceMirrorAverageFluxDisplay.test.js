const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('space mirror average flux display', () => {
  test('shows average solar flux and label', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    global.document = dom.window.document;
    global.getTemperatureUnit = () => 'K';
    global.formatNumber = v => v.toFixed(2);
    global.toDisplayTemperature = x => x;
    global.Project = class {};
    global.terraforming = {
      calculateZoneSolarFlux: zone => ({ tropical: 1000, temperate: 800, polar: 400 }[zone]),
      temperature: { zones: { tropical: { value: 0 }, temperate: { value: 0 }, polar: { value: 0 } } }
    };

    const {
      SpaceMirrorFacilityProject,
      initializeMirrorOversightUI,
      updateZonalFluxTable,
    } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
    const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
    const container = dom.window.document.getElementById('root');
    initializeMirrorOversightUI(container);
    updateZonalFluxTable();

    const header = dom.window.document.querySelector('#mirror-flux-table thead tr th:nth-child(2)').textContent;
    expect(header).toBe('Average Solar Flux (W/m2)');
    expect(dom.window.document.getElementById('mirror-flux-tropical').textContent).toBe('250.00');
    expect(dom.window.document.getElementById('mirror-flux-temperate').textContent).toBe('200.00');
    expect(dom.window.document.getElementById('mirror-flux-polar').textContent).toBe('100.00');

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
  });
});
