const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('reverse button visibility', () => {
  function setup() {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.resources = { colony: { colonists: { value: 0 }, workers: { value: 0, cap: 0 } } };
    ctx.globalEffects = { isBooleanFlagSet: () => false };
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
      displayName: 'Test Struct',
      canBeToggled: true,
      count: 0,
      active: 0,
      unlocked: true,
      isHidden: false,
      requiresProductivity: false,
      autoBuildEnabled: false,
      autoBuildPercent: 0,
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
      updateResourceStorage: () => {},
      isBooleanFlagSet: () => false,
      reversalAvailable: false
    };

    const row = ctx.createStructureRow(structure, () => {}, () => {}, false);
    dom.window.document.body.appendChild(row);

    return { dom, ctx, structure };
  }

  test('reverse button becomes visible when reversal unlocked', () => {
    const { dom, ctx, structure } = setup();
    const btn = dom.window.document.getElementById(`${structure.name}-reverse-button`);
    expect(btn.style.display).toBe('none');
    structure.reversalAvailable = true;
    ctx.updateStructureDisplay({ [structure.name]: structure });
    expect(btn.style.display).toBe('inline-block');
  });
});
