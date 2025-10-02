const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team card displays loaded members', () => {
  test('loading state redraws team member card', () => {
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

    const member = ctx.WGCTeamMember.create('Bob', '', 'Soldier', {});
    ctx.warpGateCommand.recruitMember(0, 0, member);
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();

    const saved = ctx.warpGateCommand.saveState();
    ctx.warpGateCommand.dismissMember(0, 0);
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();

    let nameSpan = dom.window.document.querySelector('.team-member-name');
    expect(nameSpan).toBeNull();

    ctx.warpGateCommand.loadState(saved);
    ctx.redrawWGCTeamCards();
    ctx.updateWGCUI();

    nameSpan = dom.window.document.querySelector('.team-member-name');
    expect(nameSpan.textContent).toBe('Bob');
  });
});
