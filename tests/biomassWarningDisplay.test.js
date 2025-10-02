const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('biomass warning display', () => {
  function setup(dyingZones) {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    ctx.terraforming = { biomassDyingZones: dyingZones };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const res = {
      name: 'biomass',
      displayName: 'Biomass',
      category: 'surface',
      value: 10,
      cap: 0,
      hasCap: false,
      reserved: 0,
      unlocked: true,
      hideWhenSmall: false,
      productionRate: 0,
      consumptionRate: 0,
      productionRateBySource: {},
      consumptionRateBySource: {},
      isBooleanFlagSet: () => false
    };

    ctx.createResourceDisplay({ surface: { biomass: res } });
    ctx.updateResourceDisplay({ surface: { biomass: res } });
    return { dom };
  }

  test('shows exclamation marks for each dying zone', () => {
    const { dom } = setup({ tropical: true, temperate: false, polar: true });
    const warn = dom.window.document.getElementById('biomass-warning');
    expect(warn.textContent).toBe('!!');
  });

  test('no exclamation marks when no zones are dying', () => {
    const { dom } = setup({ tropical: false, temperate: false, polar: false });
    const warn = dom.window.document.getElementById('biomass-warning');
    expect(warn.textContent).toBe('');
  });
});
