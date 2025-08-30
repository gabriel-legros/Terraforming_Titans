const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('day night icon display', () => {
  test('updates sun and moon icon next to productivity', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.resources = { colony: { colonists: { value: 0 }, workers: { value: 0 } } };
    ctx.globalEffects = { isBooleanFlagSet: () => false };
    const factorySettings = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ghg-automation.js'), 'utf8');
    vm.runInContext(factorySettings, ctx);
    ctx.ghgFactorySettings.autoDisableAboveTemp = false;
    ctx.ghgFactorySettings.disableTempThreshold = 0;
    ctx.ghgFactorySettings.restartCap = 1;
    ctx.ghgFactorySettings.restartTimer = 0;
    ctx.dayNightCycle = { isNight: () => false, isDay: () => true };
    ctx.toDisplayTemperature = () => 0;
    ctx.getTemperatureUnit = () => 'K';
    ctx.formatResourceDetails = () => '';
    ctx.formatStorageDetails = () => '';
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.createColonyDetails = () => dom.window.document.createElement('div');
    ctx.Colony = class {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const structure = {
      name: 'testPanel',
      displayName: 'Test',
      category: 'energy',
      canBeToggled: false,
      count: 1,
      active: 1,
      unlocked: true,
      isHidden: false,
      requiresProductivity: true,
      dayNightActivity: true,
      autoBuildEnabled: false,
      autoBuildPercent: 0,
      autoBuildPriority: false,
      getTotalWorkerNeed: () => 0,
      getEffectiveWorkerMultiplier: () => 1,
      getEffectiveCost: () => ({}),
      canAfford: () => true,
      canAffordLand: () => true,
      requiresLand: 0,
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      activeEffects: [],
      getEffectiveProductionMultiplier: () => 1,
      getModifiedProduction: () => ({}),
      getModifiedConsumption: () => ({}),
      requiresMaintenance: false,
      maintenanceCost: {},
      description: ''
    };

    const row = ctx.createStructureRow(structure, () => {}, () => {}, false);
    dom.window.document.body.appendChild(row);

    ctx.buildings = { [structure.name]: structure };
    ctx.updateStructureDisplay(ctx.buildings);

    const icon = dom.window.document.getElementById(`${structure.name}-day-night-icon`);
    expect(icon.textContent).toBe('☀️');

    ctx.dayNightCycle.isNight = () => true;
    ctx.dayNightCycle.isDay = () => false;

    ctx.updateStructureDisplay(ctx.buildings);
    expect(icon.textContent).toBe('🌙');
  });
});
