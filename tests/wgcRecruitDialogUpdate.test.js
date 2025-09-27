const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC recruit dialog updates dynamically', () => {
  test('HP and XP reflect background changes', () => {
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
    ctx.warpGateCommand.enable();
    ctx.updateWGCUI();

    const member = ctx.WGCTeamMember.create('Alice', '', 'Soldier', {});
    ctx.warpGateCommand.recruitMember(0, 0, member);
    ctx.redrawWGCTeamCards();
    ctx.openRecruitDialog(0, 0, member);

    const levelDiv = dom.window.document.querySelector('.wgc-member-level');
    expect(levelDiv.textContent).toContain('HP: 100 / 100');

    member.health = 50;
    member.xp = 5;
    ctx.updateWGCUI();

    expect(levelDiv.textContent).toContain('HP: 50 / 100');
    expect(levelDiv.textContent).toContain('XP: 5 / 10');
  });
});
