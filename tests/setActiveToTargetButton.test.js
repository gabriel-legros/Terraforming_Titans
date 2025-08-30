const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Set active to target button', () => {
  function setup() {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.resources = { colony: { colonists: { value: 50 }, workers: { value: 0 } } };
    ctx.globalEffects = { isBooleanFlagSet: flag => flag === 'automateConstruction' };
    ctx.dayNightCycle = { isNight: () => false };
    ctx.toDisplayTemperature = () => 0;
    ctx.getTemperatureUnit = () => 'K';
    ctx.formatResourceDetails = () => '';
    ctx.formatStorageDetails = () => '';
    ctx.updateColonyDetailsDisplay = () => {};
    const factorySettings = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ghg-automation.js'), 'utf8');
    vm.runInContext(factorySettings, ctx);
    ctx.ghgFactorySettings.autoDisableAboveTemp = false;
    ctx.ghgFactorySettings.disableTempThreshold = 0;
    ctx.Colony = class {};
    ctx.updateEmptyBuildingMessages = () => {};
    ctx.updateBuildingDisplay = () => {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const structure = {
      name: 'testStruct',
      displayName: 'Test',
      canBeToggled: true,
      count: 3,
      active: 0,
      unlocked: true,
      isHidden: false,
      obsolete: false,
      requiresProductivity: false,
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      getTotalWorkerNeed: () => 0,
      getEffectiveWorkerMultiplier: () => 1,
      getEffectiveCost: () => ({}),
      canAfford: () => true,
      canAffordLand: () => true,
      requiresLand: 0,
      landAffordCount: () => 10,
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      activeEffects: [],
      getEffectiveProductionMultiplier: () => 1,
      getModifiedProduction: () => ({}),
      getModifiedConsumption: () => ({}),
      requiresMaintenance: false,
      maintenanceCost: {},
      updateResourceStorage: () => {}
    };

    const row = ctx.createStructureRow(structure, () => {}, () => {}, false);
    dom.window.document.body.appendChild(row);

    ctx.buildings = { [structure.name]: structure };

    ctx.updateStructureDisplay({ [structure.name]: structure });

    return { dom, ctx, structure };
  }

  test('clicking sets active count to auto build target', () => {
    const { dom, structure } = setup();
    const btn = dom.window.document.getElementById(`${structure.name}-set-active-button`);
    btn.click();
    expect(structure.active).toBe(3);
  });

  test('checkbox appears before label inside button', () => {
    const { dom, structure } = setup();
    const btn = dom.window.document.getElementById(`${structure.name}-set-active-button`);
    const checkbox = btn.querySelector('input.auto-active-checkbox');
    expect(btn.firstChild).toBe(checkbox);
  });
});
