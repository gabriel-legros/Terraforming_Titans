const fs = require('fs');
const path = require('path');
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource rate display hide', () => {
  test('rate element removed when hideRate becomes true', () => {
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
      value: 0,
      cap: 0,
      hasCap: true,
      unlocked: true,
      hideRate: false,
      reserved: 0,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null,
      isBooleanFlagSet: () => false,
    };

    ctx.createResourceDisplay({ colony: { testResource: res } });
    ctx.updateResourceDisplay({ colony: { testResource: res } });

    expect(dom.window.document.getElementById('testResource-pps-resources-container')).not.toBeNull();

    res.hideRate = true;
    ctx.updateResourceDisplay({ colony: { testResource: res } });

    expect(dom.window.document.getElementById('testResource-pps-resources-container')).toBeNull();
  });
});
