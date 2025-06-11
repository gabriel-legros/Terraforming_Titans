const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../numbers.js');

describe('updateStructureCostDisplay worker color', () => {
  test('uses net worker requirement for orange color', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="cost"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

    ctx.resources = { colony: { workers: { value: 15 } } };

    const structure = {
      getTotalWorkerNeed: () => 10,
      getEffectiveWorkerMultiplier: () => 2,
      getEffectiveCost: () => ({}),
      requiresLand: false,
      canAffordLand: () => true,
      requiresDeposit: false,
      canAffordDeposit: () => true,
      displayName: 'Test',
      name: 'test'
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const costElement = dom.window.document.getElementById('cost');
    ctx.updateStructureCostDisplay(costElement, structure, 1);

    expect(costElement.innerHTML).toMatch(/color:\s*orange/);
  });
});
