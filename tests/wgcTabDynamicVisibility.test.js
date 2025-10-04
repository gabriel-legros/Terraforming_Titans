const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC subtab visibility reflects enabled flag', () => {
  test('updateHopeUI shows and hides the tab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="hope-subtab hidden" data-subtab="wgc-hope"></div>
      <div id="wgc-hope" class="hope-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.EffectableEntity = EffectableEntity;
    ctx.WarpGateCommand = WarpGateCommand;
    vm.createContext(ctx);
    const wgcUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    const hopeUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'hopeUI.js'), 'utf8');
    vm.runInContext(`${wgcUICode}\n${hopeUICode}`, ctx);
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.initializeWGCUI();
    ctx.updateHopeUI();

    let tab = dom.window.document.querySelector('[data-subtab="wgc-hope"]');
    let content = dom.window.document.getElementById('wgc-hope');
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);

    ctx.warpGateCommand.enable();
    ctx.updateHopeUI();
    expect(tab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);

    ctx.warpGateCommand.enabled = false;
    ctx.updateHopeUI();
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);
  });
});
