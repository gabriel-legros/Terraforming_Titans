const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team name persistence', () => {
  test('renamed team name saves and loads', () => {
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

    ctx.warpGateCommand.renameTeam(0, 'Renamed');
    ctx.redrawWGCTeamCards();
    let header = dom.window.document.querySelector('.wgc-team-card[data-team="0"] .team-name');
    expect(header.textContent).toBe('Renamed');

    const saved = ctx.warpGateCommand.saveState();
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.warpGateCommand.loadState(saved);
    ctx.redrawWGCTeamCards();
    header = dom.window.document.querySelector('.wgc-team-card[data-team="0"] .team-name');
    expect(header.textContent).toBe('Renamed');
  });
});
