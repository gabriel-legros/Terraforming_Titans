const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('toggle button count after load', () => {
  test('updateStructureDisplay updates button text to selected build count', () => {
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
    ctx.ghgFactorySettings = { autoDisableAboveTemp: false, disableTempThreshold: 0 };
    ctx.dayNightCycle = { isNight: () => false };
    ctx.toDisplayTemperature = () => 0;
    ctx.getTemperatureUnit = () => 'K';
    ctx.formatResourceDetails = () => '';
    ctx.formatStorageDetails = () => '';
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.Colony = class {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const structure = {
      name: 'testStruct',
      displayName: 'Test',
      canBeToggled: true,
      count: 5,
      active: 0,
      unlocked: true,
      isHidden: false,
      obsolete: false,
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
      maintenanceCost: {}
    };

    const row = ctx.createStructureRow(structure, () => {}, () => {}, false);
    dom.window.document.body.appendChild(row);

    vm.runInContext(`selectedBuildCounts['${structure.name}'] = 7;`, ctx);

    ctx.updateStructureDisplay({ [structure.name]: structure });

    const inc = dom.window.document.getElementById(`${structure.name}-increase-button`);
    const dec = dom.window.document.getElementById(`${structure.name}-decrease-button`);

    expect(inc.textContent).toBe('+7');
    expect(dec.textContent).toBe('-7');
  });
});
