const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'effectable-entity.js'), 'utf8');
const solisUICode = fs.readFileSync(path.join(__dirname, '..', 'solisUI.js'), 'utf8');
const solisCode = fs.readFileSync(path.join(__dirname, '..', 'solis.js'), 'utf8');
const hopeUICode = fs.readFileSync(path.join(__dirname, '..', 'hopeUI.js'), 'utf8');
const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'ui-utils.js'), 'utf8');

describe('enable effect with SolisManager and activateHopeSubtab', () => {
  test('reveals and activates the Solis tab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="hope-subtab" data-subtab="awakening-hope"></div>
      <div class="hope-subtab hidden" data-subtab="solis-hope"></div>
      <div id="awakening-hope" class="hope-subtab-content active"></div>
      <div id="solis-hope" class="hope-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    vm.runInContext(`${uiUtilsCode}\n${effectCode}\n${solisUICode}\n${solisCode}\n${hopeUICode}; this.EffectableEntity = EffectableEntity; this.SolisManager = SolisManager;`, ctx);
    ctx.globalEffects = new ctx.EffectableEntity({ description: 'global' });
    ctx.solisManager = new ctx.SolisManager();
    ctx.solisManager.addAndReplace({
      target: 'solisManager',
      type: 'enable',
      effectId: 't1',
      sourceId: 't1'
    });
    ctx.globalEffects.addAndReplace({
      target: 'global',
      type: 'activateSubtab',
      subtabClass: 'hope-subtab',
      contentClass: 'hope-subtab-content',
      targetId: 'solis-hope',
      unhide: true,
      effectId: 't2',
      sourceId: 't2'
    });
    const tab = dom.window.document.querySelector('[data-subtab="solis-hope"]');
    const content = dom.window.document.getElementById('solis-hope');
    const visible = vm.runInContext('solisTabVisible', ctx);
    expect(visible).toBe(true);
    expect(tab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
    expect(tab.classList.contains('active')).toBe(true);
    expect(content.classList.contains('active')).toBe(true);
  });
});
