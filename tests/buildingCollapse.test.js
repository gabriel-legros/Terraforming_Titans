const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('building collapse arrow', () => {
  function setup() {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.formatResourceDetails = () => '';
    ctx.formatStorageDetails = () => '';
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.resources = { colony: { colonists: { value: 50 }, workers: { value: 0 } } };
    ctx.globalEffects = { isBooleanFlagSet: () => true };
    ctx.dayNightCycle = { isNight: () => false };
    ctx.toDisplayTemperature = () => 0;
    ctx.getTemperatureUnit = () => 'K';
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.updateEmptyBuildingMessages = () => {};
    ctx.updateBuildingDisplay = () => {};
    ctx.terraforming = { celestialParameters: {} };
    ctx.ghgFactorySettings = {
      autoDisableAboveTemp: false,
      disableTempThreshold: 0,
      reverseTempThreshold: 0,
    };
    ctx.oxygenFactorySettings = { autoDisableAbovePressure: false, disablePressureThreshold: 15 };
    ctx.enforceGhgFactoryTempGap = () => {};
    ctx.Colony = class {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const structure = {
      name: 'testStruct',
      displayName: 'Test',
      description: 'd',
      canBeToggled: true,
      count: 1,
      active: 0,
      unlocked: true,
      isHidden: false,
      obsolete: false,
      requiresProductivity: false,
      autoBuildEnabled: false,
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

    return { dom, row };
  }

  test('arrow toggles collapsed state and hides details', () => {
    const { dom, row } = setup();
    const arrow = row.querySelector('.collapse-arrow');
    const cost = row.querySelector('.structure-cost');
    const prod = row.querySelector('.building-production-consumption');
    const desc = row.querySelector('.building-description');
    const autoInput = row.querySelector('.auto-build-input-container');
    const autoTarget = row.querySelector('.auto-build-target-container');

    expect(arrow.textContent).toBe('▼');
    arrow.dispatchEvent(new dom.window.Event('click'));
    expect(arrow.textContent).toBe('▶');
    expect(cost.style.display).toBe('none');
    expect(prod.style.display).toBe('none');
    expect(desc.style.display).toBe('none');
    expect(autoTarget.style.display).toBe('none');
    expect(autoInput.style.display).not.toBe('none');
    arrow.dispatchEvent(new dom.window.Event('click'));
    expect(arrow.textContent).toBe('▼');
    expect(cost.style.display).toBe('');
    expect(autoTarget.style.display).toBe('');
  });
});
