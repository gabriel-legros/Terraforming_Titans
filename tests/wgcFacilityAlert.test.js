const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC facility alert', () => {
  test('shows alert when upgrade available', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="hope-tab"><span id="hope-alert" class="hope-alert">!</span></div>
      <div class="hope-subtab" data-subtab="wgc-hope">WGC<span id="wgc-subtab-alert" class="hope-alert">!</span></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.warpGateCommand = new WarpGateCommand();
    ctx.wgcTabVisible = true;
    ctx.solisTabVisible = false;
    ctx.initializeSkillsUI = () => {};
    ctx.initializeSolisUI = () => {};
    ctx.initializeWGCUI = () => {};
    ctx.updateSkillTreeUI = () => {};
    ctx.updateSolisUI = () => {};
    ctx.updateWGCVisibility = () => {};
    ctx.updateWGCUI = () => {};
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'hopeUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.warpGateCommand.facilityCooldown = 0;
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('wgc-subtab-alert').style.display).toBe('inline');
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('inline');

    ctx.warpGateCommand.facilityCooldown = 10;
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('wgc-subtab-alert').style.display).toBe('none');
  });
});
