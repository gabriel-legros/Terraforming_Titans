const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('colonist aerostat warning display', () => {
  function setup({ lift, activeAerostats }) {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    ctx.terraforming = {};
    ctx.colonies = {
      aerostat_colony: {
        active: activeAerostats,
        getCurrentLift: () => lift
      }
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const resources = {
      colony: {
        colonists: {
          name: 'colonists',
          displayName: 'Colonists',
          category: 'colony',
          value: 1000,
          cap: 2000,
          hasCap: true,
          reserved: 0,
          unlocked: true,
          hideWhenSmall: false,
          hideRate: false,
          productionRate: 0,
          consumptionRate: 0,
          productionRateBySource: {},
          consumptionRateBySource: {},
          isBooleanFlagSet: () => false
        }
      }
    };

    ctx.createResourceDisplay(resources);
    ctx.updateResourceDisplay(resources);

    return { dom, ctx, resources };
  }

  test('shows orange exclamation mark when aerostat lift is low but above cutoff', () => {
    const { dom } = setup({ lift: 0.25, activeAerostats: 5 });
    const warn = dom.window.document.getElementById('colonists-warning');
    expect(warn.textContent).toBe('!');
    expect(warn.style.color).toBe('orange');
  });

  test('shows red exclamation mark when aerostat lift is critically low', () => {
    const { dom } = setup({ lift: 0.15, activeAerostats: 3 });
    const warn = dom.window.document.getElementById('colonists-warning');
    expect(warn.textContent).toBe('!');
    expect(warn.style.color).toBe('red');
  });

  test('hides exclamation mark when no aerostats are active', () => {
    const { dom, ctx, resources } = setup({ lift: 0.1, activeAerostats: 0 });
    ctx.colonies.aerostat_colony.active = 0;
    ctx.updateResourceDisplay(resources);
    const warn = dom.window.document.getElementById('colonists-warning');
    expect(warn.textContent).toBe('');
    expect(warn.style.color).toBe('');
  });

  test('explains the warning inside the colonist tooltip', () => {
    const { dom, ctx, resources } = setup({ lift: 0.18, activeAerostats: 4 });
    const tooltip = dom.window.document.getElementById('colonists-tooltip');
    tooltip._isActive = true;
    ctx.updateResourceRateDisplay(resources.colony.colonists);
    const warningDiv = dom.window.document.getElementById('colonists-tooltip-warning');
    expect(warningDiv.style.display).toBe('flex');
    expect(warningDiv.textContent).toContain('below the 0.20 kg/m³ minimum needed to stay aloft');
  });
});
