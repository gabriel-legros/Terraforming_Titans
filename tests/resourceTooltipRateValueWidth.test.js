const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip rate value width', () => {
  test('rate value cell has min width and no wrap', () => {
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
      productionRateBySource: { 'A very long source name': 1 },
      consumptionRateBySource: {},
      unit: null
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    ctx.updateResourceRateDisplay(resource);

    const rightCell = dom.window.document.querySelector('#metal-tooltip-production div[style*="table-row"] div:last-child');
    expect(rightCell.style.minWidth).toBe('90px');
    expect(rightCell.style.whiteSpace).toBe('nowrap');
  });
});
