const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('WGC R&D menu header', () => {
  test('populateRDMenu adds header row', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="wgc-rd-menu"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.populateRDMenu();
    const menu = dom.window.document.getElementById('wgc-rd-menu');
    const header = menu.firstElementChild;
    expect(header.classList.contains('wgc-rd-header')).toBe(true);
    expect(header.textContent).toContain('Upgrade');
    expect(header.textContent).toContain('Cost (Alien Artifacts)');
  });
});
