const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('RWG history seed selection', () => {
  test('seed column text is selectable', () => {
    const dom = new JSDOM(`<!DOCTYPE html><head></head><div id="space-random"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    // Inject CSS for computed style evaluation
    const css = fs.readFileSync(path.join(__dirname, '..', 'src/css', 'space.css'), 'utf8');
    const styleEl = dom.window.document.createElement('style');
    styleEl.textContent = css;
    dom.window.document.head.appendChild(styleEl);

    // Prepare minimal status data
    ctx.spaceManager = {
      randomWorldStatuses: {
        '123': {
          name: 'World123',
          original: { classification: { archetype: 'mars-like' } },
          visited: true,
          departedAt: 0
        }
      }
    };
    ctx.rwgManager = { isOrbitLocked: () => false, isTypeLocked: () => false };

    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(`${rwgUICode} initializeRandomWorldUI(); updateRandomWorldUI();`, ctx);

    const seedEl = dom.window.document.querySelector('.rwg-history-row .seed');
    const userSelect = dom.window.getComputedStyle(seedEl).userSelect;
    expect(userSelect).toBe('text');
  });
});
