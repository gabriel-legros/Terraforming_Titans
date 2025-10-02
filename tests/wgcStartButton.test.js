const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc.js');
const { WGCTeamMember } = require('../src/js/team-member.js');

describe('WGC start button', () => {
  test('button enabled only when team is full', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="wgc-hope"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.EffectableEntity = EffectableEntity;
    ctx.WarpGateCommand = WarpGateCommand;
    ctx.WGCTeamMember = WGCTeamMember;
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.initializeWGCUI();
    ctx.updateWGCUI();
    let btn = dom.window.document.querySelector('.start-button');
    expect(btn.disabled).toBe(true);
    for (let i = 0; i < 4; i++) {
      const m = ctx.WGCTeamMember.create('A'+i, '', 'Soldier', {});
      ctx.warpGateCommand.recruitMember(0, i, m);
    }
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();
    btn = dom.window.document.querySelector('.start-button');
    expect(btn.disabled).toBe(false);
  });
});
