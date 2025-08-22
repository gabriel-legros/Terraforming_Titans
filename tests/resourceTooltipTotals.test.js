const fs = require('fs');
const path = require('path');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip totals', () => {
  test('shows total production and consumption', () => {
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
      productionRate: 5,
      consumptionRate: 1.5,
      productionRateBySource: { Mine: 3, Factory: 2 },
      consumptionRateBySource: { Smelter: 1, Upkeep: 0.5 },
      unit: 'ton'
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    ctx.updateResourceRateDisplay(resource);

    const doc = dom.window.document;
    const prodTable = doc.querySelector('#metal-tooltip-production div[style*="display: table"]');
    const prodTotalRow = prodTable.firstElementChild;
    expect(prodTotalRow.firstElementChild.textContent).toBe('Total :');
    expect(prodTotalRow.lastElementChild.textContent).toBe('5.00/s');

    const consTable = doc.querySelector('#metal-tooltip-consumption div[style*="display: table"]');
    const consTotalRow = consTable.firstElementChild;
    expect(consTotalRow.firstElementChild.textContent).toBe('Total :');
    expect(consTotalRow.lastElementChild.textContent).toBe('1.50/s');
  });
});
