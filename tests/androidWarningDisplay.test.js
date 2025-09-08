const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('android warning display', () => {
  function setup({ androidsValue, androidsCap, landValue, landReserved }) {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatDuration = numbers.formatDuration;
    ctx.oreScanner = { scanData: {} };
    ctx.terraforming = {};
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const res = {
      colony: {
        androids: {
          name: 'androids',
          displayName: 'Androids',
          category: 'colony',
          value: androidsValue,
          cap: androidsCap,
          hasCap: true,
          reserved: 0,
          unlocked: true,
          hideWhenSmall: false,
          productionRate: 0,
          consumptionRate: 0,
          productionRateBySource: {},
          consumptionRateBySource: {},
          isBooleanFlagSet: () => false
        }
      },
      surface: {
        land: {
          name: 'land',
          displayName: 'Land',
          category: 'surface',
          value: landValue,
          cap: landValue,
          hasCap: true,
          reserved: landReserved,
          unlocked: true,
          hideWhenSmall: false,
          productionRate: 0,
          consumptionRate: 0,
          productionRateBySource: {},
          consumptionRateBySource: {},
          isBooleanFlagSet: () => false
        }
      }
    };

    ctx.createResourceDisplay(res);
    ctx.updateResourceDisplay(res);
    return { dom };
  }

  test('shows exclamation mark when androids maxed but land available', () => {
    const { dom } = setup({ androidsValue: 10, androidsCap: 10, landValue: 100, landReserved: 50 });
    const warn = dom.window.document.getElementById('androids-warning');
    expect(warn.textContent).toBe('!');
  });

  test('no exclamation mark when land nearly full', () => {
    const { dom } = setup({ androidsValue: 10, androidsCap: 10, landValue: 100, landReserved: 99 });
    const warn = dom.window.document.getElementById('androids-warning');
    expect(warn.textContent).toBe('');
  });

  test('no exclamation mark when androids below cap', () => {
    const { dom } = setup({ androidsValue: 9, androidsCap: 10, landValue: 100, landReserved: 50 });
    const warn = dom.window.document.getElementById('androids-warning');
    expect(warn.textContent).toBe('');
  });
});
