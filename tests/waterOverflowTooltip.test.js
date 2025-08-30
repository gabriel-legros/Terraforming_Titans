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
      productionRate: 0, consumptionRate: 5,
      productionRateBySource: {},
      productionRateByType: {},
      consumptionRateBySource: { 'Overflow (not summed)': 5 },
      consumptionRateByType: { overflow: { 'Overflow (not summed)': 5 } },
      unit: 'ton'
    };
    const liquid = {
      name: 'liquidWater', displayName: 'Water', category: 'surface',
      value: 0, cap: 0, hasCap: false, reserved: 0, unlocked: true,
      productionRate: 5, consumptionRate: 0,
      productionRateBySource: { Overflow: 5 },
      productionRateByType: { overflow: { Overflow: 5 } },
      consumptionRateBySource: {},
      consumptionRateByType: {},
      unit: 'ton'
    };
    ctx.createResourceDisplay({ colony: { water: colonyWater }, surface: { liquidWater: liquid } });
    dom.window.document.getElementById('water-tooltip')._isActive = true;
    dom.window.document.getElementById('liquidWater-tooltip')._isActive = true;
    ctx.updateResourceRateDisplay(colonyWater);
    ctx.updateResourceRateDisplay(liquid);
    const cwCons = dom.window.document.getElementById('water-tooltip-consumption').textContent;
    const cwOver = dom.window.document.getElementById('water-tooltip-overflow').textContent;
    const lwProd = dom.window.document.getElementById('liquidWater-tooltip-production');
    const lwOver = dom.window.document.getElementById('liquidWater-tooltip-overflow').textContent;
    expect(cwCons).not.toContain('Overflow');
    expect(cwOver).toContain('Overflow');
    expect(cwOver).toContain(numbers.formatNumber(5, false, 2));
    expect(lwProd.style.display).toBe('none');
    expect(lwOver).toContain('Overflow');
    expect(lwOver).toContain(numbers.formatNumber(5, false, 2));
  });

  test('shows on colony water and ice', () => {
    const { dom, ctx } = setup();
    const colonyWater = {
      name: 'water', displayName: 'Water', category: 'colony',
      value: 100, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 2,
      productionRateBySource: {},
      productionRateByType: {},
      consumptionRateBySource: { 'Overflow (not summed)': 2 },
      consumptionRateByType: { overflow: { 'Overflow (not summed)': 2 } },
      unit: 'ton'
    };
    const ice = {
      name: 'ice', displayName: 'Ice', category: 'surface',
      value: 0, cap: 0, hasCap: false, reserved: 0, unlocked: true,
      productionRate: 2, consumptionRate: 0,
      productionRateBySource: { Overflow: 2 },
      productionRateByType: { overflow: { Overflow: 2 } },
      consumptionRateBySource: {},
      consumptionRateByType: {},
      unit: 'ton'
    };
    ctx.createResourceDisplay({ colony: { water: colonyWater }, surface: { ice: ice } });
    dom.window.document.getElementById('water-tooltip')._isActive = true;
    dom.window.document.getElementById('ice-tooltip')._isActive = true;
    ctx.updateResourceRateDisplay(colonyWater);
    ctx.updateResourceRateDisplay(ice);
    const cwCons = dom.window.document.getElementById('water-tooltip-consumption').textContent;
    const cwOver = dom.window.document.getElementById('water-tooltip-overflow').textContent;
    const iwProd = dom.window.document.getElementById('ice-tooltip-production');
    const iwOver = dom.window.document.getElementById('ice-tooltip-overflow').textContent;
    expect(cwCons).not.toContain('Overflow');
    expect(cwOver).toContain('Overflow');
    expect(cwOver).toContain(numbers.formatNumber(2, false, 2));
    expect(iwProd.style.display).toBe('none');
    expect(iwOver).toContain('Overflow');
    expect(iwOver).toContain(numbers.formatNumber(2, false, 2));
  });

  test('hides overflow section when none', () => {
    const { dom, ctx } = setup();
    const colonyWater = {
      name: 'water', displayName: 'Water', category: 'colony',
      value: 100, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 0,
      productionRateBySource: {},
      productionRateByType: {},
      consumptionRateBySource: {},
      consumptionRateByType: {},
      unit: 'ton'
    };
    ctx.createResourceDisplay({ colony: { water: colonyWater } });
    dom.window.document.getElementById('water-tooltip')._isActive = true;
    ctx.updateResourceRateDisplay(colonyWater);
    const overflow = dom.window.document.getElementById('water-tooltip-overflow');
    expect(overflow.style.display).toBe('none');
  });
});
