const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('worker resource tooltip', () => {
  function setup() {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    ctx.populationModule = { getEffectiveWorkerRatio: () => 0.6 };
    ctx.resources = { colony: { androids: { value: 5 }, colonists: { value: 100 } } };
    ctx.buildings = {
      mine: { displayName: 'Mine', active: 2, getTotalWorkerNeed: () => 5, getEffectiveWorkerMultiplier: () => 1 },
      factory: { displayName: 'Factory', active: 1, getTotalWorkerNeed: () => 20, getEffectiveWorkerMultiplier: () => 1 }
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { dom, ctx };
  }

  test('tooltip shows worker ratio percent', () => {
    const { dom, ctx } = setup();
    const workers = {
      name: 'workers',
      displayName: 'Workers',
      category: 'colony',
      value: 10,
      cap: 60,
      hasCap: true,
      reserved: 0,
      unlocked: true,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null
    };
    ctx.createResourceDisplay({ colony: { workers } });
    const tooltip = dom.window.document.getElementById('workers-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(workers);
    const html = tooltip.innerHTML;
    expect(html).toContain('60%');
    expect(html).toContain('60 from colonists');
    expect(html).toContain('5 from androids');
  });

  test('android assignments show worker count only', () => {
    const { dom, ctx } = setup();
    ctx.projectManager = {
      getAndroidAssignments: () => [['Deeper Mining', 2]],
    };
    const workers = {
      name: 'workers',
      displayName: 'Workers',
      category: 'colony',
      value: 10,
      cap: 60,
      hasCap: true,
      reserved: 0,
      unlocked: true,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null
    };
    ctx.createResourceDisplay({ colony: { workers } });
    const tooltip = dom.window.document.getElementById('workers-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(workers);
    const html = tooltip.innerHTML;
    expect(html).toContain('60 from colonists');
    expect(html).toContain('3 from androids');
    expect(html).not.toContain('Deeper Mining');
  });

  test('androids over cap show effective worker counts', () => {
    const { dom, ctx } = setup();
    ctx.projectManager = {
      getAndroidAssignments: () => [['Deeper Mining', 4]],
    };
    ctx.resources.colony.androids = { value: 10, cap: 5 };
    const workers = {
      name: 'workers',
      displayName: 'Workers',
      category: 'colony',
      value: 10,
      cap: 60,
      hasCap: true,
      reserved: 0,
      unlocked: true,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      unit: null,
    };
    ctx.createResourceDisplay({ colony: { workers } });
    const tooltip = dom.window.document.getElementById('workers-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(workers);
    const html = tooltip.innerHTML;
    expect(html).toContain('60 from colonists');
    expect(html).toContain('1 from androids');
    expect(html).not.toContain('5 from androids');
    expect(html).not.toContain('Deeper Mining');
  });

  test('breakdown sorted by assigned workers', () => {
    const { dom, ctx } = setup();
    const workers = {
      name: 'workers', displayName: 'Workers', category: 'colony', value: 10, cap: 60,
      hasCap: true, reserved: 0, unlocked: true,
      productionRate: 0, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: null
    };
    ctx.createResourceDisplay({ colony: { workers } });
    const tooltip = dom.window.document.getElementById('workers-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(workers);
    const html = tooltip.innerHTML;
    const firstIndex = html.indexOf('Factory');
    const secondIndex = html.indexOf('Mine');
    expect(firstIndex).toBeLessThan(secondIndex);
  });
});
