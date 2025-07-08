const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('category unhide button', () => {
  test('shows button when buildings hidden and unhides on click', () => {
    const html = `<!DOCTYPE html>
      <div id="resource-unhide-container" style="display:none;">
        <button id="resource-unhide-button"></button>
      </div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.resources = { colony: { colonists: { value: 0 }, workers: { value: 0 } } };
    ctx.globalEffects = { isBooleanFlagSet: () => false };
    ctx.ghgFactorySettings = { autoDisableAboveTemp: false, disableTempThreshold: 0, restartCap: 1, restartTimer: 0 };
    ctx.dayNightCycle = { isNight: () => false };
    ctx.toDisplayTemperature = () => 0;
    ctx.getTemperatureUnit = () => 'K';
    ctx.formatResourceDetails = () => '';
    ctx.formatStorageDetails = () => '';
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.createColonyDetails = () => dom.window.document.createElement('div');
    ctx.Colony = class {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const structure = {
      name: 'test',
      displayName: 'Test',
      category: 'resource',
      canBeToggled: false,
      count: 1,
      active: 0,
      unlocked: true,
      isHidden: true,
      requiresProductivity: false,
      autoBuildEnabled: false,
      autoBuildPercent: 0.1,
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

    const row = ctx.createStructureRow(structure, () => {}, () => {});
    dom.window.document.body.appendChild(row);

    ctx.buildings = { test: structure };
    ctx.updateStructureDisplay(ctx.buildings);

    const container = dom.window.document.getElementById('resource-unhide-container');
    expect(container.style.display).toBe('block');

    const btn = dom.window.document.getElementById('resource-unhide-button');
    btn.dispatchEvent(new dom.window.Event('click'));

    expect(structure.isHidden).toBe(false);
  });
});

