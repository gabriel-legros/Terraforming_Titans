const fs = require('fs');
const path = require('path');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../numbers.js');

describe('resource tooltip units', () => {
  test('tooltip includes unit when provided', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.oreScanner = { scanData: {} };

    const code = fs.readFileSync(path.join(__dirname, '..', 'resourceUI.js'), 'utf8');
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
    ctx.updateResourceRateDisplay(resource);

    const tooltip = dom.window.document.getElementById('metal-tooltip').innerHTML;
    expect(tooltip).toContain('ton');
  });

  test('tooltip omits unit when none provided', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.oreScanner = { scanData: {} };

    const code = fs.readFileSync(path.join(__dirname, '..', 'resourceUI.js'), 'utf8');
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
    ctx.updateResourceRateDisplay(resource);

    const tooltip = dom.window.document.getElementById('colonists-tooltip').innerHTML;
    expect(tooltip).not.toContain('ton');
  });
});
