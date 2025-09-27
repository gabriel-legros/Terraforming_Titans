const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Random World Effects card collapse', () => {
  test('arrow toggles collapsed class and icon', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="space-random"><div id="rwg-history"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const rwgEffectsUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgEffectsUI.js'), 'utf8');
    vm.runInContext(`${uiUtilsCode}\n${rwgEffectsUICode}`, ctx);
    vm.runInContext('_ensureRWGEffectsUI();', ctx);

    const card = dom.window.document.getElementById('rwg-effects-card');
    const arrow = card.querySelector('.collapse-arrow');
    expect(card.classList.contains('collapsed')).toBe(false);
    expect(arrow.innerHTML).toBe('▼');

    arrow.dispatchEvent(new dom.window.Event('click'));

    expect(card.classList.contains('collapsed')).toBe(true);
    expect(arrow.innerHTML).toBe('▶');
  });
});
