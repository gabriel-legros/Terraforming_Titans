const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('WGC tab hidden by default', () => {
  test('initializeWGCUI hides tab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="hope-subtab" data-subtab="wgc-hope"></div>
      <div id="wgc-hope"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);
    ctx.initializeWGCUI();
    const tab = dom.window.document.querySelector('[data-subtab="wgc-hope"]');
    const content = dom.window.document.getElementById('wgc-hope');
    const visible = vm.runInContext('wgcTabVisible', ctx);
    expect(visible).toBe(false);
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);
  });
});
