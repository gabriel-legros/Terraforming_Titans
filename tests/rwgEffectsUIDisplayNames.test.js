const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Random World Generator effects UI display names', () => {
  test('effects list uses custom display names', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="space-random"><div id="rwg-history"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    const rwgEffectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgEffects.js'), 'utf8');
    const rwgEffectsUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgEffectsUI.js'), 'utf8');

    vm.runInContext(`
      ${rwgCode}
      ${rwgEffectsCode}
      ${rwgEffectsUICode}
    `, ctx);

    ctx.spaceManager = { randomWorldStatuses: { abc: { terraformed: true, original: { override: { classification: { archetype: 'icy-moon' } } } } } };
    vm.runInContext('updateRWGEffectsUI();', ctx);

    const header = dom.window.document.querySelector('.rwg-effects-head[data-type="icy-moon"] .col-type strong');
    expect(header.textContent).toBe('Icy');
  });
});

