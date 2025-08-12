const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('average resource changes setting', () => {
  function setup(gameSettings) {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    ctx.gameSettings = gameSettings;
    ctx.playTimeSeconds = 0;
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { dom, ctx };
  }

  test('uses averaged rate when setting enabled', () => {
    const { dom, ctx } = setup({ averageResourceChanges: true });
    const resource = {
      name: 'co2', displayName: 'CO2', category: 'surface', value: 10, cap: 100,
      hasCap: true, reserved: 0, unlocked: true, productionRate: 1, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'kg',
      isBooleanFlagSet: () => false,
      getRecentRate: () => 2
    };
    ctx.createResourceDisplay({ surface: { co2: resource } });
    ctx.updateResourceRateDisplay(resource);
    const text = dom.window.document.getElementById('co2-pps-resources-container').textContent;
    expect(text).toBe('+2.00/s');
  });

  test('uses tick rate when setting disabled', () => {
    const { dom, ctx } = setup({ averageResourceChanges: false });
    const resource = {
      name: 'co2', displayName: 'CO2', category: 'surface', value: 10, cap: 100,
      hasCap: true, reserved: 0, unlocked: true, productionRate: 1, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'kg',
      isBooleanFlagSet: () => false,
      getRecentRate: () => 2
    };
    ctx.createResourceDisplay({ surface: { co2: resource } });
    ctx.updateResourceRateDisplay(resource);
    const text = dom.window.document.getElementById('co2-pps-resources-container').textContent;
    expect(text).toBe('+1.00/s');
  });
});
