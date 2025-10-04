const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Random World Generator worker reduction effect UI', () => {
  test('shows description and value for Venus-like worlds', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="space-random"><div id="rwg-history"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    const read = file => fs.readFileSync(path.join(__dirname, '..', 'src/js', file), 'utf8');
    vm.runInContext(`
      ${read('rwg.js')}
      ${read('rwgEffects.js')}
      ${read('rwgEffectsUI.js')}
    `, ctx);

    ctx.rwgManager.unlockType('venus-like');

    ctx.spaceManager = {
      randomWorldStatuses: {
        venus: {
          terraformed: true,
          original: { override: { classification: { archetype: 'venus-like' } } },
        },
      },
    };

    vm.runInContext('updateRWGEffectsUI();', ctx);

    const desc = dom.window.document.querySelector('[data-effect="rwg-venus-workers"] .col-desc small');
    const value = dom.window.document.querySelector('[data-effect="rwg-venus-workers"] .col-effect');

    expect(desc.textContent).toBe('Worker requirements reduced (+1% each)');
    expect(value.textContent).toBe('-1.0%');
  });
});

