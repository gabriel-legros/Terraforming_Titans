const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('land resource tooltip', () => {
  function setup() {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    ctx.buildings = {
      factory: { displayName: 'Factory', active: 2, requiresLand: 100 },
      greenhouse: { displayName: 'Greenhouse', active: 3, requiresLand: 10 }
    };
    ctx.colonies = {
      outpost: { displayName: 'Outpost', active: 1, requiresLand: 500 }
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { dom, ctx };
  }

  test('breakdown sorted by land usage', () => {
    const { dom, ctx } = setup();
    const land = {
      name: 'land',
      displayName: 'Land',
      category: 'surface',
      value: 1000,
      reserved: 230,
      hasCap: true,
      unlocked: true,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null
    };
    ctx.createResourceDisplay({ surface: { land } });
    const tooltip = dom.window.document.getElementById('land-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(land);
    const html = tooltip.innerHTML;
    expect(tooltip.textContent).toContain('Land can be recovered by turning off the corresponding building');
    expect(html).toContain('Outpost');
    expect(html).toContain('Factory');
    expect(html).toContain('Greenhouse');
    const firstIndex = html.indexOf('Outpost');
    const secondIndex = html.indexOf('Factory');
    const thirdIndex = html.indexOf('Greenhouse');
    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
    expect(html).toContain('500');
    expect(html).toContain('200');
    expect(html).toContain('30');
  });
});
