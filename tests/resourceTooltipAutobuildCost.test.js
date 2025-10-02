const fs = require('fs');
const path = require('path');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip autobuild cost', () => {
  test('shows averaged autobuild cost with breakdown', () => {
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
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: 'ton'
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    ctx.autobuildCostTracker.recordCost('Habitat', { colony: { metal: 5 } });
    ctx.autobuildCostTracker.update(1000);
    const tooltip = dom.window.document.getElementById('metal-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);

    const html = tooltip.innerHTML;
    expect(html).toContain('Autobuild Cost');
    expect(html).toContain(numbers.formatNumber(5, false, 2));
    expect(html).toContain('Habitat');
  });
});
