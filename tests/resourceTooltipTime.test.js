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

  test('shows time to full for positive rate', () => {
    const { dom, ctx } = setup();
    const resource = {
      name: 'metal', displayName: 'Metal', category: 'colony',
      value: 50, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 2, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'ton'
    };
    ctx.createResourceDisplay({ colony: { metal: resource } });
    const tooltip = dom.window.document.getElementById('metal-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    const html = tooltip.innerHTML;
    expect(html).toContain('Time to full');
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
    const tooltip = dom.window.document.getElementById('water-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    const html = tooltip.innerHTML;
    expect(html).toContain('Time to empty');
    const expected = numbers.formatDuration(40 / 4);
    expect(html).toContain(expected);
  });

  test('shows 0 time to full when already full', () => {
    const { dom, ctx } = setup();
    const resource = {
      name: 'oxygen', displayName: 'O2', category: 'colony',
      value: 100, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 5, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'kg'
    };
    ctx.createResourceDisplay({ colony: { oxygen: resource } });
    const tooltip = dom.window.document.getElementById('oxygen-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    const html = tooltip.innerHTML;
    expect(html).toContain('Time to full');
    expect(html).toContain('0s');
  });

  test('shows 0 time to empty when already empty', () => {
    const { dom, ctx } = setup();
    const resource = {
      name: 'fuel', displayName: 'Fuel', category: 'colony',
      value: 0, cap: 50, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 3,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'kg'
    };
    ctx.createResourceDisplay({ colony: { fuel: resource } });
    const tooltip = dom.window.document.getElementById('fuel-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    const html = tooltip.innerHTML;
    expect(html).toContain('Time to empty');
    expect(html).toContain('0s');
  });

  test('shows years for long time to full', () => {
    const { dom, ctx } = setup();
    const YEAR = 365 * 24 * 3600;
    const resource = {
      name: 'hydrogen', displayName: 'Hydrogen', category: 'colony',
      value: 0, cap: YEAR * 2, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 1, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'kg'
    };
    ctx.createResourceDisplay({ colony: { hydrogen: resource } });
    const tooltip = dom.window.document.getElementById('hydrogen-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    const html = tooltip.innerHTML;
    expect(html).toContain('Time to full');
    expect(html).toContain('2 years');
  });

  test('shows years for long time to empty', () => {
    const { dom, ctx } = setup();
    const YEAR = 365 * 24 * 3600;
    const resource = {
      name: 'nitrogen', displayName: 'Nitrogen', category: 'colony',
      value: YEAR * 2, cap: YEAR * 2, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 1,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'kg'
    };
    ctx.createResourceDisplay({ colony: { nitrogen: resource } });
    const tooltip = dom.window.document.getElementById('nitrogen-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    const html = tooltip.innerHTML;
    expect(html).toContain('Time to empty');
    expect(html).toContain('2 years');
  });

  test('shows blank line when rate is zero', () => {
    const { dom, ctx } = setup();
    const resource = {
      name: 'silicon', displayName: 'Silicon', category: 'colony',
      value: 50, cap: 100, hasCap: true, reserved: 0, unlocked: true,
      productionRate: 2, consumptionRate: 2,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: 'kg'
    };
    ctx.createResourceDisplay({ colony: { silicon: resource } });
    const tooltip = dom.window.document.getElementById('silicon-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resource);
    const timeDiv = dom.window.document.getElementById('silicon-tooltip-time');
    expect(timeDiv.innerHTML).toBe('&nbsp;');
  });
});
