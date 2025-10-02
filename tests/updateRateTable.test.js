const fs = require('fs');
const path = require('path');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('updateRateTable', () => {
  test('removes unused rows and ignores near-zero values', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const resource = {
      name: 'metal',
      displayName: 'Metal',
      category: 'colony',
      value: 100,
      cap: 1000,
      hasCap: true,
      reserved: 0,
      unlocked: true,
      productionRate: 1,
      consumptionRate: 0,
      productionRateBySource: { Mine: 1 },
      consumptionRateBySource: {},
      unit: 'ton'
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    const tooltip = dom.window.document.getElementById('metal-tooltip');
    tooltip._isActive = true;

    // Initial update adds a row
    ctx.updateResourceRateDisplay(resource);
    const prodDiv = dom.window.document.getElementById('metal-tooltip-production');
    expect(prodDiv._info.rows.size).toBe(1);

    // Clearing entries removes the row
    resource.productionRateBySource = {};
    resource.productionRate = 0;
    ctx.updateResourceRateDisplay(resource);
    expect(prodDiv._info.rows.size).toBe(0);

    // Very small values are ignored
    resource.productionRateBySource = { Mine: 1e-13 };
    resource.productionRate = 1e-13;
    ctx.updateResourceRateDisplay(resource);
    expect(prodDiv._info.rows.size).toBe(0);
  });
});
