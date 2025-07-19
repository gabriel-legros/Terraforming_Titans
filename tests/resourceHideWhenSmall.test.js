const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource hideWhenSmall display', () => {
  function setup(value) {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const res = {
      name: 'dryIce',
      displayName: 'Dry Ice',
      category: 'surface',
      value: value,
      cap: 0,
      hasCap: false,
      reserved: 0,
      unlocked: true,
      hideWhenSmall: true,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      isBooleanFlagSet: () => false
    };
    ctx.createResourceDisplay({ surface: { dryIce: res } });
    ctx.updateResourceDisplay({ surface: { dryIce: res } });
    return { dom, res, ctx };
  }

  test('hidden when below threshold', () => {
    const { dom } = setup(5e-5);
    const el = dom.window.document.getElementById('dryIce-container');
    expect(el.style.display).toBe('none');
  });

  test('shown when above threshold', () => {
    const { dom } = setup(1e-3);
    const el = dom.window.document.getElementById('dryIce-container');
    expect(el.style.display).toBe('block');
  });
});
