const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc.js');
const { WGCTeamMember } = require('../src/js/team-member.js');

describe('WGC dismiss restrictions', () => {
  test('dismiss button disabled during active operation', () => {
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
    ctx.warpGateCommand.enable();
    for (let i = 0; i < 4; i++) {
      ctx.warpGateCommand.recruitMember(0, i, ctx.WGCTeamMember.create('A'+i, '', 'Soldier', {}));
    }
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();
    ctx.warpGateCommand.startOperation(0);
    ctx.updateWGCUI();
    ctx.openRecruitDialog(0, 0, ctx.warpGateCommand.teams[0][0]);
    const btn = Array.from(dom.window.document.querySelectorAll('.wgc-popup-window button'))
      .find(b => b.textContent === 'Dismiss');
    expect(btn.disabled).toBe(true);
  });

  test('dismissMember returns false when operation active', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('B'+i, '', 'Soldier', {}));
    }
    wgc.startOperation(0);
    const result = wgc.dismissMember(0, 0);
    expect(result).toBe(false);
    expect(wgc.teams[0][0]).not.toBeNull();
  });
});
