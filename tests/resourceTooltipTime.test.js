const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip time remaining', () => {
  function setup() {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { dom, ctx };
  }

  test('shows time to cap for positive rate', () => {
    const { dom, ctx } = setup();
    const resource = {
      name: 'metal', displayName: 'Metal', category: 'colony',
      value: 50, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 2, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton'
    };
    ctx.createResourceDisplay({ colony: { metal: resource } });
    ctx.updateResourceRateDisplay(resource);
    const html = dom.window.document.getElementById('metal-tooltip').innerHTML;
    expect(html).toContain('Time to cap');
    const expected = numbers.formatDuration((100 - 50) / 2);
    expect(html).toContain(expected);
  });

  test('shows time to empty for negative rate', () => {
    const { dom, ctx } = setup();
    const resource = {
      name: 'water', displayName: 'Water', category: 'colony',
      value: 40, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 4,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton'
    };
    ctx.createResourceDisplay({ colony: { water: resource } });
    ctx.updateResourceRateDisplay(resource);
    const html = dom.window.document.getElementById('water-tooltip').innerHTML;
    expect(html).toContain('Time to empty');
    const expected = numbers.formatDuration(40 / 4);
    expect(html).toContain(expected);
  });
});
