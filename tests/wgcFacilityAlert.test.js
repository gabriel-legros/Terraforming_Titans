const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

describe('WGC facility alert', () => {
  test('shows alert when upgrade available', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="hope-tab"><span id="hope-alert" class="hope-alert">!</span></div>
      <div class="hope-subtab" data-subtab="wgc-hope">WGC<span id="wgc-subtab-alert" class="hope-alert">!</span></div>
      <div id="wgc-hope"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.console = console;
    ctx.document = dom.window.document;
    ctx.formatDuration = numbers.formatDuration;
    ctx.EffectableEntity = EffectableEntity;
    ctx.WarpGateCommand = require('../src/js/wgc.js').WarpGateCommand;
    ctx.WGCTeamMember = require('../src/js/team-member.js').WGCTeamMember;
    ctx.updateSolisVisibility = () => {};
    ctx.initializeSkillsUI = () => {};
    ctx.initializeSolisUI = () => {};
    ctx.updateSkillTreeUI = () => {};
    ctx.updateSolisUI = () => {};

    const wgcUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(wgcUICode, ctx);
    const hopeUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'hopeUI.js'), 'utf8');
    vm.runInContext(hopeUICode, ctx);

    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.warpGateCommand.enabled = true;
    ctx.initializeHopeUI();

    ctx.warpGateCommand.facilityCooldown = 0;
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('wgc-subtab-alert').style.display).toBe('inline');
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('inline');
    expect(dom.window.document.getElementById('wgc-facility-alert').style.display).toBe('inline');

    ctx.warpGateCommand.facilityCooldown = 10;
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('wgc-subtab-alert').style.display).toBe('none');
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('none');
    expect(dom.window.document.getElementById('wgc-facility-alert').style.display).toBe('none');
  });
});
