const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC dismiss button', () => {
  test('dismiss disabled while operation active', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="wgc-hope"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.EffectableEntity = EffectableEntity;
    ctx.WGCTeamMember = WGCTeamMember;
    ctx.WarpGateCommand = WarpGateCommand;
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.initializeWGCUI();
    for (let i = 0; i < 4; i++) {
      ctx.warpGateCommand.recruitMember(0, i, ctx.WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();
    ctx.warpGateCommand.startOperation(0);
    ctx.updateWGCUI();
    ctx.openRecruitDialog(0, 0, ctx.warpGateCommand.teams[0][0]);
    const btns = dom.window.document.querySelectorAll('.wgc-popup-window button');
    const dismiss = Array.from(btns).find(b => b.textContent === 'Dismiss');
    expect(dismiss.disabled).toBe(true);
  });
});
