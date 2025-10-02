const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('space mirror day temperature display', () => {
  test('shows day temperatures and label', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    global.document = dom.window.document;
    global.getTemperatureUnit = () => 'K';
    global.formatNumber = v => v.toFixed(2);
    global.toDisplayTemperature = x => x;
    global.Project = class {};
    global.terraforming = {
      calculateZoneSolarFlux: () => 0,
      temperature: { zones: {
        tropical: { day: 300, value: 295, trendValue: 298 },
        temperate: { day: 280, value: 276, trendValue: 274 },
        polar: { day: 260, value: 258, trendValue: 257 },
      } }
    };

    const {
      SpaceMirrorFacilityProject,
      initializeMirrorOversightUI,
      updateZonalFluxTable,
    } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
    new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
    const container = dom.window.document.getElementById('root');
    initializeMirrorOversightUI(container);
    updateZonalFluxTable();

    const header = dom.window.document.querySelector('#mirror-flux-table thead tr th:nth-child(4)').textContent;
    expect(header).toBe('Day Temperature (K) Current / Trend');
    expect(dom.window.document.getElementById('mirror-day-temp-tropical').textContent).toBe('300.00 / 303.00');
    expect(dom.window.document.getElementById('mirror-day-temp-temperate').textContent).toBe('280.00 / 278.00');
    expect(dom.window.document.getElementById('mirror-day-temp-polar').textContent).toBe('260.00 / 259.00');

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
