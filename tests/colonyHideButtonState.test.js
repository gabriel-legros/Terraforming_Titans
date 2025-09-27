const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('colony hide button state', () => {
  test('hide button disabled while colony active', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    // minimal stubs required by structuresUI.js
    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.resources = { colony: { colonists: { value: 0 }, workers: { value: 0 } } };
    ctx.globalEffects = { isBooleanFlagSet: () => false };
    ctx.ghgFactorySettings = {
      autoDisableAboveTemp: false,
      disableTempThreshold: 0,
      reverseTempThreshold: 0,
      restartCap: 1,
      restartTimer: 0,
    };
    ctx.oxygenFactorySettings = { autoDisableAbovePressure: false, disablePressureThreshold: 15 };
    ctx.enforceGhgFactoryTempGap = () => {};
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

    const structure = {
      name: 'testColony',
      displayName: 'Test',
      canBeToggled: false,
      count: 1,
      active: 1,
      unlocked: true,
      isHidden: false,
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

    const row = ctx.createStructureRow(structure, () => {}, () => {}, true);
    dom.window.document.body.appendChild(row);

    ctx.updateStructureDisplay({ [structure.name]: structure });

    const hideBtn = row.querySelector('.hide-button');
    expect(hideBtn.style.display).toBe('inline-block');
    expect(hideBtn.disabled).toBe(true);

    structure.active = 0;
    ctx.updateStructureDisplay({ [structure.name]: structure });

    expect(hideBtn.disabled).toBe(false);
  });
});
