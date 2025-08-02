const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
const wgcUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
const wgcCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgc.js'), 'utf8');
const hopeUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'hopeUI.js'), 'utf8');
const progressGanymede = require('../src/js/story/ganymede.js');

describe('chapter14.0 reward enables WGC and activates its tab', () => {
  test('reward effects show and activate WGC subtab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="hope-subtab" data-subtab="awakening-hope"></div>
      <div class="hope-subtab hidden" data-subtab="wgc-hope"></div>
      <div id="awakening-hope" class="hope-subtab-content active"></div>
      <div id="wgc-hope" class="hope-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    vm.runInContext(`${uiUtilsCode}\n${effectCode}\n${wgcUICode}\n${wgcCode}\n${hopeUICode}; this.EffectableEntity = EffectableEntity; this.WarpGateCommand = WarpGateCommand;`, ctx);
    ctx.globalEffects = new ctx.EffectableEntity({ description: 'global' });
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    const chapter = progressGanymede.chapters.find(c => c.id === 'chapter14.0');
    const wgcEffect = chapter.reward.find(e => e.target === 'warpGateCommand');
    const tabEffect = chapter.reward.find(e => e.target === 'global');
    ctx.warpGateCommand.addAndReplace(wgcEffect);
    ctx.globalEffects.addAndReplace(tabEffect);
    const tab = dom.window.document.querySelector('[data-subtab="wgc-hope"]');
    const content = dom.window.document.getElementById('wgc-hope');
    const visible = vm.runInContext('wgcTabVisible', ctx);
    expect(ctx.warpGateCommand.enabled).toBe(true);
    expect(visible).toBe(true);
    expect(tab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
    expect(tab.classList.contains('active')).toBe(true);
    expect(content.classList.contains('active')).toBe(true);
  });
});
