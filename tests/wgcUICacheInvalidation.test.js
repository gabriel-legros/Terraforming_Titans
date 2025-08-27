const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

describe('WGC UI cache invalidation', () => {
  test('hp bar updates after cache invalidation', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="wgc-hope"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.EffectableEntity = EffectableEntity;
    ctx.WGCTeamMember = require('../src/js/team-member.js').WGCTeamMember;
    ctx.WarpGateCommand = require('../src/js/wgc.js').WarpGateCommand;
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.initializeWGCUI();
    ctx.warpGateCommand.enable();
    const member = new ctx.WGCTeamMember({ firstName: 'A', classType: 'Soldier', health: 100, maxHealth: 100 });
    ctx.warpGateCommand.recruitMember(0, 0, member);
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();

    member.health = 50;
    ctx.updateWGCUI();
    let fill = dom.window.document.querySelector('.team-hp-bar-fill');
    expect(fill.style.height).toBe('50%');

    ctx.invalidateWGCTeamCache();
    member.health = 25;
    ctx.updateWGCUI();
    fill = dom.window.document.querySelector('.team-hp-bar-fill');
    expect(fill.style.height).toBe('25%');
  });
});
