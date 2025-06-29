const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip zonal values', () => {
  function setupContext() {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.oreScanner = { scanData: {} };
    ctx.terraforming = {
      zonalWater: {
        tropical: { liquid: 10, ice: 5, buriedIce: 15 },
        temperate: { liquid: 20, ice: 10, buriedIce: 25 },
        polar: { liquid: 30, ice: 15, buriedIce: 35 }
      },
      zonalSurface: {
        tropical: { dryIce: 1 },
        temperate: { dryIce: 2 },
        polar: { dryIce: 3 }
      },
      zonalHydrocarbons: { tropical: {}, temperate: {}, polar: {} }
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { dom, ctx };
  }

  test('liquid water tooltip shows zonal amounts', () => {
    const { dom, ctx } = setupContext();
    const resource = {
      name: 'liquidWater', displayName: 'Water', category: 'surface',
      value: 60, hasCap: false, cap: 0, unlocked: true, reserved: 0,
      productionRate: 0, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton'
    };
    ctx.createResourceDisplay({ surface: { liquidWater: resource } });
    ctx.updateResourceRateDisplay(resource);
    const html = dom.window.document.getElementById('liquidWater-tooltip').innerHTML;
    expect(html).toContain('Tropical: ' + numbers.formatNumber(10, false, 3));
    expect(html).toContain('Temperate: ' + numbers.formatNumber(20, false, 3));
    expect(html).toContain('Polar: ' + numbers.formatNumber(30, false, 3));
  });

  test('ice tooltip sums surface and buried ice', () => {
    const { dom, ctx } = setupContext();
    const resource = {
      name: 'ice', displayName: 'Ice', category: 'surface',
      value: 0, hasCap: false, cap: 0, unlocked: true, reserved: 0,
      productionRate: 0, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton'
    };
    ctx.createResourceDisplay({ surface: { ice: resource } });
    ctx.updateResourceRateDisplay(resource);
    const html = dom.window.document.getElementById('ice-tooltip').innerHTML;
    const trop = numbers.formatNumber(5 + 15, false, 3);
    const temp = numbers.formatNumber(10 + 25, false, 3);
    const pol = numbers.formatNumber(15 + 35, false, 3);
    expect(html).toContain('Tropical: ' + trop);
    expect(html).toContain('Temperate: ' + temp);
    expect(html).toContain('Polar: ' + pol);
  });

  test('dry ice tooltip shows zonal amounts', () => {
    const { dom, ctx } = setupContext();
    const resource = {
      name: 'dryIce', displayName: 'Dry Ice', category: 'surface',
      value: 6, hasCap: false, cap: 0, unlocked: true, reserved: 0,
      productionRate: 0, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton'
    };
    ctx.createResourceDisplay({ surface: { dryIce: resource } });
    ctx.updateResourceRateDisplay(resource);
    const html = dom.window.document.getElementById('dryIce-tooltip').innerHTML;
    expect(html).toContain('Tropical: ' + numbers.formatNumber(1, false, 3));
    expect(html).toContain('Temperate: ' + numbers.formatNumber(2, false, 3));
    expect(html).toContain('Polar: ' + numbers.formatNumber(3, false, 3));
  });
});
