const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Solis tab hidden by default', () => {
  test('initializeSolisUI hides tab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="hope-subtab" data-subtab="solis-hope"></div>
      <div id="solis-hope"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'solisUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);
    ctx.initializeSolisUI();
    const tab = dom.window.document.querySelector('[data-subtab="solis-hope"]');
    const content = dom.window.document.getElementById('solis-hope');
    const visible = vm.runInContext('solisTabVisible', ctx);
    expect(visible).toBe(false);
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);
  });
});
