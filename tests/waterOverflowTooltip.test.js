const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('overflow rate appears in tooltip', () => {
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

  test('shows on colony water and liquid water', () => {
    const { dom, ctx } = setup();
    const colonyWater = {
      name: 'water', displayName: 'Water', category: 'colony',
      value: 100, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 0, productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton',
      overflowRate: 5
    };
    const liquid = {
      name: 'liquidWater', displayName: 'Water', category: 'surface',
      value: 0, cap: 0, hasCap: false, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 0, productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton',
      overflowRate: 5
    };
    ctx.createResourceDisplay({ colony: { water: colonyWater }, surface: { liquidWater: liquid } });
    ctx.updateResourceRateDisplay(colonyWater);
    ctx.updateResourceRateDisplay(liquid);
    const cw = dom.window.document.getElementById('water-tooltip').innerHTML;
    const lw = dom.window.document.getElementById('liquidWater-tooltip').innerHTML;
    expect(cw).toContain('Overflow');
    expect(cw).toContain(numbers.formatNumber(5, false, 2));
    expect(lw).toContain('Overflow');
    expect(lw).toContain(numbers.formatNumber(5, false, 2));
  });

  test('shows on colony water and ice', () => {
    const { dom, ctx } = setup();
    const colonyWater = {
      name: 'water', displayName: 'Water', category: 'colony',
      value: 100, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 0, productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton',
      overflowRate: 2
    };
    const ice = {
      name: 'ice', displayName: 'Ice', category: 'surface',
      value: 0, cap: 0, hasCap: false, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 0, productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton',
      overflowRate: 2
    };
    ctx.createResourceDisplay({ colony: { water: colonyWater }, surface: { ice: ice } });
    ctx.updateResourceRateDisplay(colonyWater);
    ctx.updateResourceRateDisplay(ice);
    const cw = dom.window.document.getElementById('water-tooltip').innerHTML;
    const iw = dom.window.document.getElementById('ice-tooltip').innerHTML;
    expect(cw).toContain('Overflow');
    expect(cw).toContain(numbers.formatNumber(2, false, 2));
    expect(iw).toContain('Overflow');
    expect(iw).toContain(numbers.formatNumber(2, false, 2));
  });
});
