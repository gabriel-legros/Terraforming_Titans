const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC member card display', () => {
  test('shows XP and max health', () => {
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
    const member = new ctx.WGCTeamMember({ firstName: 'Bob', classType: 'Soldier', xp: 5, maxHealth: 120, health: 120 });
    ctx.warpGateCommand.recruitMember(0, 0, member);
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();
    ctx.openRecruitDialog(0, 0, member);
    const text = dom.window.document.querySelector('.wgc-popup-window').textContent;
    expect(text).toMatch(/XP:\s*5/);
    expect(text).toMatch(/Max HP:\s*120/);
  });
});
