const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

function setup() {
  const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();

  ctx.formatNumber = n => n;
  ctx.formatBigInteger = n => String(n);
  ctx.formatBuildingCount = n => String(n);
  ctx.multiplyByTen = n => n * 10;
  ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
  ctx.resources = {
    colony: {
      colonists: { value: 50 },
      workers: { value: 0, cap: 20 }
    }
  };
  ctx.globalEffects = { isBooleanFlagSet: () => false };
  ctx.dayNightCycle = { isNight: () => false, isDay: () => true };
  ctx.toDisplayTemperature = () => 0;
  ctx.getTemperatureUnit = () => 'K';
  ctx.formatResourceDetails = () => '';
  ctx.formatStorageDetails = () => '';
  ctx.updateColonyDetailsDisplay = () => {};
  ctx.updateUnhideButtons = () => {};
  ctx.ghgFactorySettings = {
    autoDisableAboveTemp: false,
    disableTempThreshold: 0,
    reverseTempThreshold: 0
  };
  ctx.oxygenFactorySettings = {
    autoDisableAbovePressure: false,
    disablePressureThreshold: 15
  };
  ctx.enforceGhgFactoryTempGap = () => {};
  ctx.Colony = function Colony() {};
  ctx.updateEmptyBuildingMessages = () => {};
  ctx.updateBuildingDisplay = () => {};
  ctx.gameSettings = {};
  ctx.terraforming = null;

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
    autoBuildEnabled: true,
    autoBuildPercent: 10,
    autoBuildPriority: false,
    autoActiveEnabled: false,
    autoBuildBasis: 'population',
    autoBuildPartial: false,
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
    updateUI: () => {}
  };

  const row = ctx.createStructureRow(structure, () => {}, () => {}, false);
  dom.window.document.body.appendChild(row);

  return { dom, ctx, structure };
}

describe('auto-build target styling', () => {
  test('target text turns orange when partial flag is set', () => {
    const { dom, ctx, structure } = setup();
    const structures = { [structure.name]: structure };
    ctx.updateStructureDisplay(structures);
    const target = dom.window.document.getElementById(`${structure.name}-auto-build-target`);
    expect(target.style.color).toBe('');

    structure.autoBuildPartial = true;
    ctx.updateStructureDisplay(structures);
    expect(target.style.color).toBe('orange');

    structure.autoBuildPartial = false;
    ctx.updateStructureDisplay(structures);
    expect(target.style.color).toBe('');
  });
});
