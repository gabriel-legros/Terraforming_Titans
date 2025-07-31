const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

describe('WGC alerts', () => {
  test('unlock and injury trigger alerts', () => {
    const html = `<!DOCTYPE html>
      <div id="hope-tab"><span id="hope-alert" class="hope-alert">!</span></div>
      <div class="hope-subtab" data-subtab="wgc-hope">WGC<span id="wgc-subtab-alert" class="hope-alert">!</span></div>
      <div id="wgc-hope" class="hope-subtab-content"></div>`;
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.EffectableEntity = EffectableEntity;
  ctx.gameSettings = {};
    ctx.solisTabVisible = false;
    ctx.solisManager = null;
    ctx.initializeSkillsUI = () => {};
    ctx.initializeSolisUI = () => {};
    ctx.updateSkillTreeUI = () => {};
    ctx.updateSolisUI = () => {};
    ctx.addJournalEntry = () => {};
    const hopeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'hopeUI.js'), 'utf8');
    vm.runInContext(hopeCode, ctx);
    const wgcUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(wgcUICode, ctx);
    const { WGCTeamMember } = require('../src/js/team-member.js');
    ctx.WGCTeamMember = WGCTeamMember;
    ctx.module = { exports: {} };
    ctx.require = require;
    const wgcCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgc.js'), 'utf8');
    vm.runInContext(wgcCode, ctx);
    ctx.WarpGateCommand = ctx.module.exports.WarpGateCommand;

    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.showWGCTab();
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('inline');
    expect(dom.window.document.getElementById('wgc-subtab-alert').style.display).toBe('inline');

    ctx.markWGCViewed();
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('none');
    expect(dom.window.document.getElementById('wgc-subtab-alert').style.display).toBe('none');

    const member = ctx.WGCTeamMember.create('Bob', '', 'Soldier', {});
    ctx.warpGateCommand.recruitMember(0, 0, member);
    ctx.warpGateCommand.operations[0].difficulty = 10;
    ctx.warpGateCommand.roll = () => ({ sum: 1, rolls: [1] });
    ctx.wgcTabVisible = true;
    const event = { name: 'Test', type: 'individual', skill: 'power' };
    ctx.warpGateCommand.resolveEvent(0, event);
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('inline');
    expect(dom.window.document.getElementById('wgc-subtab-alert').style.display).toBe('inline');
  });
});
