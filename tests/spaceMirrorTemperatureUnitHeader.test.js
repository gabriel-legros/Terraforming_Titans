const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');

describe('Space Mirror temperature header', () => {
  test('updates with Celsius/Kelvin setting', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>');
    const original = {
      document: global.document,
      formatNumber: global.formatNumber,
      toDisplayTemperature: global.toDisplayTemperature,
      getTemperatureUnit: global.getTemperatureUnit,
      gameSettings: global.gameSettings,
      terraforming: global.terraforming,
      Project: global.Project,
      projectElements: global.projectElements,
      buildings: global.buildings,
    };
    global.document = dom.window.document;
    global.formatNumber = numbers.formatNumber;
    global.toDisplayTemperature = numbers.toDisplayTemperature;
    global.getTemperatureUnit = numbers.getTemperatureUnit;
    global.gameSettings = { useCelsius: false };
    global.terraforming = {
      calculateZoneSolarFlux: () => 0,
      temperature: { zones: { tropical: { value: 273.15 }, temperate: { value: 273.15 }, polar: { value: 273.15 } } }
    };
    global.Project = class {};
    global.projectElements = {};
    global.buildings = {};

    const { SpaceMirrorFacilityProject, initializeMirrorOversightUI, updateZonalFluxTable } = require('../src/js/projects/SpaceMirrorFacilityProject.js');
    const project = new SpaceMirrorFacilityProject({ name: 'Mirror', cost: {}, duration: 0 }, 'spaceMirrorFacility');
    const container = document.getElementById('container');
    initializeMirrorOversightUI(container);
    let header = document.querySelector('#mirror-flux-table thead tr th:nth-child(3)');
    expect(header.textContent).toBe('Temperature (K) Current / Trend');
    gameSettings.useCelsius = true;
    updateZonalFluxTable();
    header = document.querySelector('#mirror-flux-table thead tr th:nth-child(3)');
    expect(header.textContent).toBe('Temperature (°C) Current / Trend');

    if (original.document === undefined) delete global.document; else global.document = original.document;
    if (original.formatNumber === undefined) delete global.formatNumber; else global.formatNumber = original.formatNumber;
    if (original.toDisplayTemperature === undefined) delete global.toDisplayTemperature; else global.toDisplayTemperature = original.toDisplayTemperature;
    if (original.getTemperatureUnit === undefined) delete global.getTemperatureUnit; else global.getTemperatureUnit = original.getTemperatureUnit;
    if (original.gameSettings === undefined) delete global.gameSettings; else global.gameSettings = original.gameSettings;
    if (original.terraforming === undefined) delete global.terraforming; else global.terraforming = original.terraforming;
    if (original.Project === undefined) delete global.Project; else global.Project = original.Project;
    if (original.projectElements === undefined) delete global.projectElements; else global.projectElements = original.projectElements;
    if (original.buildings === undefined) delete global.buildings; else global.buildings = original.buildings;
    delete require.cache[require.resolve('../src/js/projects/SpaceMirrorFacilityProject.js')];
  });
});
