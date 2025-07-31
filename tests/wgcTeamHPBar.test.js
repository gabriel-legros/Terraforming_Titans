const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

describe('WGC team HP bar', () => {
  test('hp bar reflects health percent and color', () => {
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
    const healthy = new ctx.WGCTeamMember({ firstName: 'A', classType: 'Soldier', health: 100, maxHealth: 100 });
    const wounded = new ctx.WGCTeamMember({ firstName: 'B', classType: 'Soldier', health: 20, maxHealth: 100 });
    ctx.warpGateCommand.recruitMember(0, 0, healthy);
    ctx.warpGateCommand.recruitMember(0, 1, wounded);
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();
    const fills = dom.window.document.querySelectorAll('.team-hp-bar-fill');
    expect(fills.length).toBe(2);
    expect(fills[0].style.height).toBe('100%');
    expect(fills[0].classList.contains('critical-hp')).toBe(false);
    expect(fills[0].classList.contains('low-hp')).toBe(false);
    expect(fills[1].style.height).toBe('20%');
    expect(fills[1].classList.contains('critical-hp')).toBe(true);
  });
});
