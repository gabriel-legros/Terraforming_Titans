const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceDisposalProject mass driver info', () => {
  test('displays active mass drivers when the flag is enabled', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectElements = {};

    const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
    vm.runInContext(
      `${numbersCode}; this.formatNumber = formatNumber; this.formatBigInteger = formatBigInteger; this.formatBuildingCount = formatBuildingCount;`,
      ctx
    );

    ctx.EffectableEntity = EffectableEntity;
    ctx.shipEfficiency = 1;
    ctx.formatTotalCostDisplay = () => '';
    ctx.formatTotalResourceGainDisplay = () => '';
    ctx.formatTotalMaintenanceDisplay = () => '';
    ctx.projectManager = { projects: {}, isBooleanFlagSet: () => false };
    ctx.gameSettings = {};
    ctx.resources = {
      colony: {},
      surface: { liquidWater: { displayName: 'Liquid Water', value: 0 } },
      atmospheric: {},
      special: { spaceships: { value: 0 } },
    };

    const originalGlobals = {
      document: global.document,
      window: global.window,
      projectElements: global.projectElements,
      formatNumber: global.formatNumber,
      formatBigInteger: global.formatBigInteger,
      formatBuildingCount: global.formatBuildingCount,
      formatTotalCostDisplay: global.formatTotalCostDisplay,
      formatTotalResourceGainDisplay: global.formatTotalResourceGainDisplay,
      formatTotalMaintenanceDisplay: global.formatTotalMaintenanceDisplay,
      projectManager: global.projectManager,
      gameSettings: global.gameSettings,
      resources: global.resources,
      shipEfficiency: global.shipEfficiency,
      buildings: global.buildings,
    };

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const exportBaseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceExportBaseProject.js'), 'utf8');
    vm.runInContext(exportBaseCode + '; this.SpaceExportBaseProject = SpaceExportBaseProject;', ctx);
    const disposalCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceDisposalProject.js'), 'utf8');
    vm.runInContext(disposalCode + '; this.SpaceDisposalProject = SpaceDisposalProject;', ctx);

    global.document = dom.window.document;
    global.window = dom.window;
    global.projectElements = ctx.projectElements;
    global.formatNumber = ctx.formatNumber;
    global.formatBigInteger = ctx.formatBigInteger;
    global.formatBuildingCount = ctx.formatBuildingCount;
    global.formatTotalCostDisplay = ctx.formatTotalCostDisplay;
    global.formatTotalResourceGainDisplay = ctx.formatTotalResourceGainDisplay;
    global.formatTotalMaintenanceDisplay = ctx.formatTotalMaintenanceDisplay;
    global.projectManager = ctx.projectManager;
    global.gameSettings = ctx.gameSettings;
    global.resources = ctx.resources;
    global.shipEfficiency = ctx.shipEfficiency;
    global.buildings = { massDriver: { active: 0 } };
    ctx.buildings = global.buildings;

    try {
      const config = {
        name: 'dispose',
        category: 'resources',
        cost: {},
        duration: 1000,
        description: '',
        repeatable: true,
        maxRepeatCount: Infinity,
        unlocked: true,
        attributes: {
          spaceExport: true,
          costPerShip: {},
          disposalAmount: 1000,
          disposable: { surface: ['liquidWater'] },
        },
      };

      const project = new ctx.SpaceDisposalProject(config, 'dispose');
      ctx.projectManager.projects.dispose = project;

      const container = dom.window.document.getElementById('container');
      project.renderUI(container);
      project.updateUI();

      const elements = ctx.projectElements.dispose;
      expect(elements.massDriverInfoSection).toBeDefined();
      expect(elements.massDriverInfoSection.style.display).toBe('none');

      global.buildings.massDriver.active = 7;
      ctx.buildings.massDriver.active = 7;
      project.applyBooleanFlag({ flagId: 'massDriverEnabled', value: true });
      project.updateUI();

      expect(elements.massDriverInfoSection.style.display).toBe('block');
      expect(elements.massDriverCountElement).toBeDefined();
      expect(elements.massDriverCountElement.textContent).toBe('7');
      expect(elements.massDriverInfoElement.textContent).toBe('Active Mass Drivers: 7');
      expect(elements.massDriverInfoNoteElement).toBeDefined();
      expect(elements.massDriverInfoNoteElement.classList.contains('project-description')).toBe(true);
      expect(elements.massDriverInfoNoteElement.textContent).toBe('Electromagnetic launch rails fling cargo without rockets. Each Mass Driver counts as 10 spaceships.');

      global.buildings.massDriver.active = 12;
      ctx.buildings.massDriver.active = 12;
      project.updateUI();
      expect(elements.massDriverCountElement.textContent).toBe('12');
      expect(elements.massDriverInfoElement.textContent).toBe('Active Mass Drivers: 12');
      expect(elements.massDriverInfoNoteElement.textContent).toBe('Electromagnetic launch rails fling cargo without rockets. Each Mass Driver counts as 10 spaceships.');
    } finally {
      if (originalGlobals.document === undefined) {
        delete global.document;
      } else {
        global.document = originalGlobals.document;
      }
      if (originalGlobals.window === undefined) {
        delete global.window;
      } else {
        global.window = originalGlobals.window;
      }
      if (originalGlobals.projectElements === undefined) {
        delete global.projectElements;
      } else {
        global.projectElements = originalGlobals.projectElements;
      }
      if (originalGlobals.formatNumber === undefined) {
        delete global.formatNumber;
      } else {
        global.formatNumber = originalGlobals.formatNumber;
      }
      if (originalGlobals.formatBigInteger === undefined) {
        delete global.formatBigInteger;
      } else {
        global.formatBigInteger = originalGlobals.formatBigInteger;
      }
      if (originalGlobals.formatBuildingCount === undefined) {
        delete global.formatBuildingCount;
      } else {
        global.formatBuildingCount = originalGlobals.formatBuildingCount;
      }
      if (originalGlobals.formatTotalCostDisplay === undefined) {
        delete global.formatTotalCostDisplay;
      } else {
        global.formatTotalCostDisplay = originalGlobals.formatTotalCostDisplay;
      }
      if (originalGlobals.formatTotalResourceGainDisplay === undefined) {
        delete global.formatTotalResourceGainDisplay;
      } else {
        global.formatTotalResourceGainDisplay = originalGlobals.formatTotalResourceGainDisplay;
      }
      if (originalGlobals.formatTotalMaintenanceDisplay === undefined) {
        delete global.formatTotalMaintenanceDisplay;
      } else {
        global.formatTotalMaintenanceDisplay = originalGlobals.formatTotalMaintenanceDisplay;
      }
      if (originalGlobals.projectManager === undefined) {
        delete global.projectManager;
      } else {
        global.projectManager = originalGlobals.projectManager;
      }
      if (originalGlobals.gameSettings === undefined) {
        delete global.gameSettings;
      } else {
        global.gameSettings = originalGlobals.gameSettings;
      }
      if (originalGlobals.resources === undefined) {
        delete global.resources;
      } else {
        global.resources = originalGlobals.resources;
      }
      if (originalGlobals.shipEfficiency === undefined) {
        delete global.shipEfficiency;
      } else {
        global.shipEfficiency = originalGlobals.shipEfficiency;
      }
      if (originalGlobals.buildings === undefined) {
        delete global.buildings;
      } else {
        global.buildings = originalGlobals.buildings;
      }
    }
  });
});

