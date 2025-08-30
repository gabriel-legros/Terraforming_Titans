const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip hover updates', () => {
  test('updates only when active', () => {
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
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null,
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    const tooltip = dom.window.document.getElementById('metal-tooltip');
    const valueDiv = dom.window.document.getElementById('metal-tooltip-value');

    // Initial update while active
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    expect(valueDiv.textContent).toBe(`Value ${numbers.formatNumber(100, false, 3)}`);

    // Change value while inactive; tooltip should remain unchanged
    tooltip._isActive = false;
    resource.value = 200;
    ctx.updateResourceRateDisplay(resource);
    expect(valueDiv.textContent).toBe(`Value ${numbers.formatNumber(100, false, 3)}`);

    // Reactivate and update; tooltip should refresh
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    expect(valueDiv.textContent).toBe(`Value ${numbers.formatNumber(200, false, 3)}`);
  });
});
