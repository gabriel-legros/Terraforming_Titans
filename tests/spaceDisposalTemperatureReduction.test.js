const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceDisposalProject temperature reduction display', () => {
  test('shows reduction when disposing greenhouse gas', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectElements = {};

    const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
    vm.runInContext(numbersCode + '; this.formatNumber = formatNumber; this.toDisplayTemperature = toDisplayTemperature; this.toDisplayTemperatureDelta = toDisplayTemperatureDelta; this.getTemperatureUnit = getTemperatureUnit;', ctx);
    ctx.EffectableEntity = EffectableEntity;
    ctx.gameSettings = {};

    ctx.formatTotalCostDisplay = () => '';
    ctx.formatTotalResourceGainDisplay = () => '';
    ctx.projectManager = { isBooleanFlagSet: () => false };

    const originalGlobals = {
      resources: global.resources,
      terraforming: global.terraforming,
      projectElements: global.projectElements,
      formatNumber: global.formatNumber,
      toDisplayTemperature: global.toDisplayTemperature,
      toDisplayTemperatureDelta: global.toDisplayTemperatureDelta,
      getTemperatureUnit: global.getTemperatureUnit,
      formatTotalCostDisplay: global.formatTotalCostDisplay,
      formatTotalResourceGainDisplay: global.formatTotalResourceGainDisplay,
      projectManager: global.projectManager,
      gameSettings: global.gameSettings,
    };

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBase = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBase + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const disposalSubclass = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalSubclass + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);

    ctx.resources = {
      atmospheric: { greenhouseGas: { value: 1000 } },
      special: { spaceships: { value: 10 } },
      colony: {},
      surface: {},
      underground: {},
    };
    ctx.shipEfficiency = 1;

    const baseTemp = 250;
    const factor = 0.001;
    ctx.terraforming = {
      temperature: { value: baseTemp },
      updateSurfaceTemperature: function () {
        this.temperature.value = baseTemp + ctx.resources.atmospheric.greenhouseGas.value * factor;
      },
    };
    ctx.terraforming.updateSurfaceTemperature();

    global.resources = ctx.resources;
    global.terraforming = ctx.terraforming;
    global.projectElements = ctx.projectElements;
    global.formatNumber = ctx.formatNumber;
    global.toDisplayTemperature = ctx.toDisplayTemperature;
    global.toDisplayTemperatureDelta = ctx.toDisplayTemperatureDelta;
    global.getTemperatureUnit = ctx.getTemperatureUnit;
    global.formatTotalCostDisplay = ctx.formatTotalCostDisplay;
    global.formatTotalResourceGainDisplay = ctx.formatTotalResourceGainDisplay;
    global.projectManager = ctx.projectManager;
    global.gameSettings = ctx.gameSettings;

    const config = { name: 'dispose', category: 'resources', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: { spaceExport: true, disposalAmount: 100, disposable: { atmospheric: ['greenhouseGas'] } } };
    const project = new ctx.SpaceDisposalProject(config, 'dispose');
    project.assignedSpaceships = 1;
    project.selectedDisposalResource = { category: 'atmospheric', resource: 'greenhouseGas' };

    try {
      const container = dom.window.document.getElementById('container');
      project.renderUI(container);
      project.updateUI();
      const elem = ctx.projectElements['dispose'].temperatureReductionElement;
      expect(elem.textContent).toBe('Temperature will reduce by: 0.10K');
      ctx.gameSettings.useCelsius = true;
      project.updateUI();
      expect(elem.textContent).toBe('Temperature will reduce by: 0.10°C');
    } finally {
      global.resources = originalGlobals.resources;
      global.terraforming = originalGlobals.terraforming;
      global.projectElements = originalGlobals.projectElements;
      global.formatNumber = originalGlobals.formatNumber;
      global.toDisplayTemperature = originalGlobals.toDisplayTemperature;
      global.toDisplayTemperatureDelta = originalGlobals.toDisplayTemperatureDelta;
      global.getTemperatureUnit = originalGlobals.getTemperatureUnit;
      global.formatTotalCostDisplay = originalGlobals.formatTotalCostDisplay;
      global.formatTotalResourceGainDisplay = originalGlobals.formatTotalResourceGainDisplay;
      global.projectManager = originalGlobals.projectManager;
      global.gameSettings = originalGlobals.gameSettings;
    }
  });
});
