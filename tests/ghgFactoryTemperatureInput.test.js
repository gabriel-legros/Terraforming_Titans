const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

function setup() {
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

  const factorySettings = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ghg-automation.js'), 'utf8');
  vm.runInContext(factorySettings, ctx);

  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code, ctx);

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
    isBooleanFlagSet: flag => flag === 'terraformingBureauFeature',
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
});
