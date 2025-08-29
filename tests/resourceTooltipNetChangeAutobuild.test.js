const fs = require('fs');
const path = require('path');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip net change including autobuild', () => {
  test('shows net change minus autobuild average cost', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };

    let code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'autobuild.js'), 'utf8');
    vm.runInContext(code, ctx);
    code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
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
      productionRate: 10,
      consumptionRate: 2,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: 'ton'
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    ctx.autobuildCostTracker.recordCost('Habitat', { colony: { metal: 3 } });
    ctx.autobuildCostTracker.update(1000);

    ctx.updateResourceRateDisplay(resource);

    const netEl = dom.window.document.getElementById('metal-tooltip-net');
    const expected = `Net Change (including autobuild): ${numbers.formatNumber(5, false, 2)} ton/s`;
    expect(netEl.textContent).toBe(expected);
  });
});
