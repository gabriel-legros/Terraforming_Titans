const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

test('autobuild auto-active setting defaults to enabled', () => {
  const globals = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'globals.js'), 'utf8');
  expect(/autobuildAlsoSetsActive:\s*true/.test(globals)).toBe(true);
});

function setup(settingEnabled){
  const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();

  ctx.formatNumber = n => n;
  ctx.formatBigInteger = n => String(n);
  ctx.formatBuildingCount = n => String(n);
  ctx.multiplyByTen = n => n * 10;
  ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
  ctx.resources = { colony: { colonists: { value: 100 }, workers: { value: 0 } } };
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
  ctx.gameSettings = { autobuildAlsoSetsActive: settingEnabled };

  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code, ctx);

  const structure = {
    name: 'testStruct',
    displayName: 'Test',
    canBeToggled: true,
    count: 0,
    active: 0,
    unlocked: true,
    isHidden: false,
    obsolete: false,
    requiresProductivity: false,
    autoBuildEnabled: false,
    autoBuildPercent: 10,
    autoBuildPriority: false,
    autoActiveEnabled: false,
    autoBuildBasis: 'population',
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

  return { dom, structure };
}

describe('autobuild checkbox also sets active', () => {
  test('auto-active checked when setting enabled', () => {
    const { dom, structure } = setup(true);
    const autoBuildCheckbox = dom.window.document.querySelector('.auto-build-checkbox');
    const autoActiveCheckbox = dom.window.document.querySelector('.auto-active-checkbox');
    autoBuildCheckbox.checked = true;
    autoBuildCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(autoActiveCheckbox.checked).toBe(true);
    expect(structure.autoActiveEnabled).toBe(true);
  });

  test('auto-active not checked when setting disabled', () => {
    const { dom, structure } = setup(false);
    const autoBuildCheckbox = dom.window.document.querySelector('.auto-build-checkbox');
    const autoActiveCheckbox = dom.window.document.querySelector('.auto-active-checkbox');
    autoBuildCheckbox.checked = true;
    autoBuildCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(autoActiveCheckbox.checked).toBe(false);
    expect(structure.autoActiveEnabled).toBe(false);
  });
});

