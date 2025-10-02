const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('android resource tooltip', () => {
  test('shows worker and project assignments', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.resources = { colony: { androids: {
      name: 'androids', displayName: 'Androids', category: 'colony', value: 10, cap: 5, hasCap: true,
      reserved: 0, unlocked: true, productionRate: 0, consumptionRate: 0,
      productionRateBySource: {}, consumptionRateBySource: {}, unit: null
    } } };
    ctx.projectManager = { getAndroidAssignments: () => [['Deeper Mining', 2]] };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.createResourceDisplay(ctx.resources);
    const tooltip = dom.window.document.getElementById('androids-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(ctx.resources.colony.androids);
    const text = dom.window.document.getElementById('androids-tooltip-assignments').textContent;
    expect(text).toContain('Workers');
    expect(text).toContain('3');
    expect(text).toContain('Deeper Mining');
    expect(text).toContain('2');
  });
});
