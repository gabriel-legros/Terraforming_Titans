const fs = require('fs');
const path = require('path');
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource rate unstable display', () => {
  test('shows Unstable when positive and negative rates are balanced', () => {
    const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
    const { JSDOM } = require(jsdomPath);
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.resources = { colony: {} };
    ctx.buildings = {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const res = {
      name: 'testResource',
      displayName: 'Test',
      category: 'colony',
      value: 10,
      cap: 100,
      hasCap: true,
      unlocked: true,
      hideRate: false,
      reserved: 0,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null,
      rateHistory: [],
      isBooleanFlagSet: () => false,
    };

    ctx.createResourceDisplay({ colony: { testResource: res } });

    // five positive rates
    for (let i = 0; i < 5; i++) {
      res.productionRate = 1;
      res.consumptionRate = 0;
      ctx.updateResourceRateDisplay(res);
    }

    // five negative rates
    for (let i = 0; i < 5; i++) {
      res.productionRate = 0;
      res.consumptionRate = 1;
      ctx.updateResourceRateDisplay(res);
    }

    const rateEl = dom.window.document.getElementById('testResource-pps-resources-container');
    expect(rateEl.textContent).toBe('Unstable');
  });
});
