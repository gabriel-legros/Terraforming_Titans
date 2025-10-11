const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function loadCoreScripts(ctx) {
  const numbersCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'numbers.js'), 'utf8');
  vm.runInContext(
    `${numbersCode}; this.formatNumber = formatNumber; this.formatBigInteger = formatBigInteger; this.formatBuildingCount = formatBuildingCount;`,
    ctx
  );
  const buildCountCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildCount.js'), 'utf8');
  vm.runInContext(`${buildCountCode}; this.multiplyByTen = multiplyByTen; this.divideByTen = divideByTen;`, ctx);
  vm.runInContext('const selectedBuildCounts = {}; this.selectedBuildCounts = selectedBuildCounts;', ctx);
}

function loadProjectScripts(ctx) {
  const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
  vm.runInContext(`${projectsCode}; this.Project = Project;`, ctx);
  const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
  vm.runInContext(`${spaceshipCode}; this.SpaceshipProject = SpaceshipProject;`, ctx);
  const exportBaseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceExportBaseProject.js'), 'utf8');
  vm.runInContext(`${exportBaseCode}; this.SpaceExportBaseProject = SpaceExportBaseProject;`, ctx);
  const disposalCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceDisposalProject.js'), 'utf8');
  vm.runInContext(`${disposalCode}; this.SpaceDisposalProject = SpaceDisposalProject;`, ctx);
}

function createBaseContext() {
  const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.document = dom.window.document;
  ctx.console = console;
  ctx.projectElements = {};
  loadCoreScripts(ctx);

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
  ctx.adjustStructureActivation = (structure, change) => {
    const cappedChange = Math.trunc(change || 0);
    if (!cappedChange) {
      return;
    }
    const next = Math.max(0, Math.min(structure.active + cappedChange, structure.count));
    structure.active = next;
  };
  ctx.updateBuildingDisplay = () => {};
  ctx.selectedBuildCounts.massDriver = 1;

  return { dom, ctx };
}

function captureGlobals() {
  return {
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
    selectedBuildCounts: global.selectedBuildCounts,
    adjustStructureActivation: global.adjustStructureActivation,
    updateBuildingDisplay: global.updateBuildingDisplay,
    multiplyByTen: global.multiplyByTen,
    divideByTen: global.divideByTen,
  };
}

function applyGlobals(ctx, dom, buildingState) {
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
  global.buildings = buildingState;
  global.selectedBuildCounts = ctx.selectedBuildCounts;
  global.adjustStructureActivation = ctx.adjustStructureActivation;
  global.updateBuildingDisplay = ctx.updateBuildingDisplay;
  global.multiplyByTen = ctx.multiplyByTen;
  global.divideByTen = ctx.divideByTen;
  ctx.buildings = global.buildings;
}

function restoreGlobals(snapshot) {
  const keys = Object.keys(snapshot);
  for (const key of keys) {
    if (snapshot[key] === undefined) {
      delete global[key];
    } else {
      global[key] = snapshot[key];
    }
  }
}

function instantiateProject(ctx) {
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
  const container = ctx.document.getElementById('container');
  project.renderUI(container);
  return project;
}

describe('SpaceDisposalProject mass driver info', () => {
  test('displays mass driver counts and button labels when enabled', () => {
    const { dom, ctx } = createBaseContext();
    loadProjectScripts(ctx);
    const snapshot = captureGlobals();
    applyGlobals(ctx, dom, { massDriver: { active: 0, count: 12 } });

    try {
      const project = instantiateProject(ctx);
      project.updateUI();

      const elements = ctx.projectElements.dispose;
      expect(elements.massDriverInfoSection).toBeDefined();
      expect(elements.massDriverInfoSection.style.display).toBe('none');

      ctx.buildings.massDriver.active = 7;
      project.applyBooleanFlag({ flagId: 'massDriverEnabled', value: true });
      project.updateUI();

      expect(elements.massDriverInfoSection.style.display).toBe('block');
      expect(elements.massDriverActiveElement.textContent).toBe('7');
      expect(elements.massDriverBuiltElement.textContent).toBe('12');
      expect(elements.massDriverDecreaseButton.textContent).toBe('-1');
      expect(elements.massDriverIncreaseButton.textContent).toBe('+1');
      expect(elements.massDriverInfoNoteElement.textContent).toBe('Electromagnetic launch rails fling cargo without rockets. Each Mass Driver counts as 10 spaceships.');

      ctx.buildings.massDriver.active = 12;
      project.updateUI();
      expect(elements.massDriverActiveElement.textContent).toBe('12');
      expect(elements.massDriverBuiltElement.textContent).toBe('12');
    } finally {
      restoreGlobals(snapshot);
    }
  });

  test('mass driver controls adjust active counts and step sizing', () => {
    const { dom, ctx } = createBaseContext();
    loadProjectScripts(ctx);
    const snapshot = captureGlobals();
    applyGlobals(ctx, dom, { massDriver: { active: 0, count: 20 } });

    try {
      const project = instantiateProject(ctx);
      project.applyBooleanFlag({ flagId: 'massDriverEnabled', value: true });
      project.updateUI();

      const elements = ctx.projectElements.dispose;

      elements.massDriverIncreaseButton.click();
      project.updateUI();
      expect(ctx.buildings.massDriver.active).toBe(1);
      expect(elements.massDriverActiveElement.textContent).toBe('1');
      expect(elements.massDriverBuiltElement.textContent).toBe('20');

      elements.massDriverMultiplyButton.click();
      project.updateUI();
      expect(ctx.selectedBuildCounts.massDriver).toBe(10);
      expect(elements.massDriverIncreaseButton.textContent).toBe('+10');
      expect(elements.massDriverDecreaseButton.textContent).toBe('-10');

      elements.massDriverIncreaseButton.click();
      project.updateUI();
      expect(ctx.buildings.massDriver.active).toBe(11);

      elements.massDriverDivideButton.click();
      project.updateUI();
      expect(ctx.selectedBuildCounts.massDriver).toBe(1);
      expect(elements.massDriverIncreaseButton.textContent).toBe('+1');

      elements.massDriverDecreaseButton.click();
      project.updateUI();
      expect(ctx.buildings.massDriver.active).toBe(10);

      elements.massDriverZeroButton.click();
      project.updateUI();
      expect(ctx.buildings.massDriver.active).toBe(0);
      expect(elements.massDriverActiveElement.textContent).toBe('0');
      expect(elements.massDriverBuiltElement.textContent).toBe('20');

      elements.massDriverMaxButton.click();
      project.updateUI();
      expect(ctx.buildings.massDriver.active).toBe(20);
      expect(elements.massDriverActiveElement.textContent).toBe('20');
      expect(elements.massDriverBuiltElement.textContent).toBe('20');
    } finally {
      restoreGlobals(snapshot);
    }
  });
});
