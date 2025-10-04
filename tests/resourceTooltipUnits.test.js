const fs = require('fs');
const path = require('path');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('resource tooltip units', () => {
  test('tooltip includes unit when provided', () => {
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
      consumptionRate: 0.5,
      productionRateBySource: { Mine: 1 },
      consumptionRateBySource: { Factory: 0.5 },
      unit: 'ton'
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    const tooltipEl = dom.window.document.getElementById('metal-tooltip');
    tooltipEl._isActive = true;
    ctx.updateResourceRateDisplay(resource);

    const tooltip = tooltipEl.innerHTML;
    expect(tooltip).toContain('ton');
  });

  test('tooltip omits unit when none provided', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const resource = {
      name: 'colonists',
      displayName: 'Colonists',
      category: 'colony',
      value: 10,
      cap: 100,
      hasCap: true,
      reserved: 0,
      unlocked: true,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null
    };

    ctx.createResourceDisplay({ colony: { colonists: resource } });
    const tooltipEl = dom.window.document.getElementById('colonists-tooltip');
    tooltipEl._isActive = true;
    ctx.updateResourceRateDisplay(resource);

    const tooltip = tooltipEl.innerHTML;
    expect(tooltip).not.toContain('ton');
  });

  test('table rows omit unit but top value retains it', () => {
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
      consumptionRate: 0.5,
      productionRateBySource: { Mine: 1 },
      consumptionRateBySource: { Factory: 0.5 },
      unit: 'ton'
    };

    ctx.createResourceDisplay({ colony: { metal: resource } });
    const tooltipEl = dom.window.document.getElementById('metal-tooltip');
    tooltipEl._isActive = true;
    ctx.updateResourceRateDisplay(resource);

    const tooltip = tooltipEl.innerHTML;
    expect(tooltip).toContain('Value');
    expect(tooltip).toContain('ton');
    const netText = dom.window.document.getElementById('metal-tooltip-net').textContent;
    expect(netText).toContain(' ton/s');
    const prodHtml = dom.window.document.getElementById('metal-tooltip-production').innerHTML;
    expect(prodHtml).not.toContain(' ton/s');
    const consHtml = dom.window.document.getElementById('metal-tooltip-consumption').innerHTML;
    expect(consHtml).not.toContain(' ton/s');
  });
});
