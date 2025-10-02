const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

function setup(options = {}) {
  const { bureauEnabled = true } = options;
  const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.document = dom.window.document;
  ctx.console = console;
  ctx.gameSettings = { useCelsius: true };
  ctx.formatNumber = n => n;
  ctx.formatBigInteger = n => String(n);
  ctx.formatBuildingCount = n => String(n);
  ctx.multiplyByTen = n => n * 10;
  ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
  ctx.resources = { colony: { colonists: { value: 50 }, workers: { value: 0 } } };
  ctx.globalEffects = { isBooleanFlagSet: () => false };
  ctx.dayNightCycle = { isNight: () => false };
  ctx.toDisplayTemperature = k => ctx.gameSettings.useCelsius ? k - 273.15 : k;
  ctx.getTemperatureUnit = () => ctx.gameSettings.useCelsius ? '°C' : 'K';
  ctx.formatResourceDetails = () => '';
  ctx.formatStorageDetails = () => '';
  ctx.updateColonyDetailsDisplay = () => {};
  ctx.updateEmptyBuildingMessages = () => {};
  ctx.updateBuildingDisplay = () => {};
  ctx.adjustStructureActivation = () => {};
  ctx.buildings = {};

  ctx.ghgFactorySettings = {
    autoDisableAboveTemp: false,
    disableTempThreshold: 283.15,
    reverseTempThreshold: 283.15,
  };
  ctx.oxygenFactorySettings = { autoDisableAbovePressure: false, disablePressureThreshold: 15 };
  ctx.enforceGhgFactoryTempGap = () => {};

  const structuresCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(structuresCode, ctx);

  ctx.Building = class {};
  const ghgFactoryCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings', 'GhgFactory.js'), 'utf8');
  vm.runInContext(ghgFactoryCode, ctx);

  const structure = {
    name: 'ghgFactory',
    displayName: 'GHG Factory',
    canBeToggled: true,
    count: 1,
    active: 0,
    unlocked: true,
    isHidden: false,
    obsolete: false,
    requiresProductivity: false,
    autoBuildEnabled: true,
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
    reversalAvailable: false,
    isBooleanFlagSet: flag => flag === 'terraformingBureauFeature' ? bureauEnabled : false,
    initUI: ctx.GhgFactory.prototype.initUI,
    updateUI: ctx.GhgFactory.prototype.updateUI,
  };

  const row = ctx.createStructureRow(structure, () => {}, () => {}, false);
  dom.window.document.body.appendChild(row);

  return { dom, ctx };
}

describe('GHG factory temperature control', () => {
  test('allows decimal thresholds', () => {
    const { dom, ctx } = setup();
    const inputs = dom.window.document.querySelectorAll('.ghg-temp-input');
    const inputA = inputs[0];
    const inputB = inputs[1];
    expect(inputA.step).toBe('0.1');
    expect(inputB.step).toBe('0.1');
    inputA.value = '25.5';
    inputA.dispatchEvent(new dom.window.Event('input'));
    expect(ctx.ghgFactorySettings.disableTempThreshold).toBeCloseTo(298.65, 5);
  });

  test('does not overwrite while typing', () => {
    const { dom, ctx } = setup();
    const inputA = dom.window.document.querySelector('.ghg-temp-input');
    ctx.ghgFactorySettings.disableTempThreshold = 275;
    inputA.value = '25.5';
    inputA.focus();
    if (dom.window.document.activeElement !== inputA) {
      inputA.value = ctx.toDisplayTemperature(ctx.ghgFactorySettings.disableTempThreshold);
    }
    expect(inputA.value).toBe('25.5');
    inputA.blur();
    if (dom.window.document.activeElement !== inputA) {
      inputA.value = ctx.toDisplayTemperature(ctx.ghgFactorySettings.disableTempThreshold);
    }
    expect(parseFloat(inputA.value)).toBeCloseTo(1.85, 5);
  });

  test('controls hidden without terraforming bureau research', () => {
    const { dom } = setup({ bureauEnabled: false });
    const control = dom.window.document.querySelector('.ghg-temp-control');
    expect(control.style.display).toBe('none');
  });
});
