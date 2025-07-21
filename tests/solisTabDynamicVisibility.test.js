const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis subtab visibility reflects enabled flag', () => {
  test('updateHopeUI shows and hides the tab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="hope-subtab hidden" data-subtab="solis-hope"></div>
      <div id="solis-hope" class="hope-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.EffectableEntity = EffectableEntity;
    ctx.SolisManager = SolisManager;
    vm.createContext(ctx);
    const solisUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'solisUI.js'), 'utf8');
    const hopeUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'hopeUI.js'), 'utf8');
    vm.runInContext(`${solisUICode}\n${hopeUICode}`, ctx);
    ctx.solisManager = new ctx.SolisManager();
    ctx.initializeSolisUI();
    ctx.updateHopeUI();

    let tab = dom.window.document.querySelector('[data-subtab="solis-hope"]');
    let content = dom.window.document.getElementById('solis-hope');
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);

    ctx.solisManager.enable();
    ctx.updateHopeUI();
    expect(tab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);

    ctx.solisManager.enabled = false;
    ctx.updateHopeUI();
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);
  });
});
