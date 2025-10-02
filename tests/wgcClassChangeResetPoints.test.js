const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC recruit class change resets points', () => {
  test('changing class after allocating points resets allocation', () => {
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

    ctx.openRecruitDialog(0, 1, null);

    const overlay = dom.window.document.querySelector('.wgc-popup-overlay');
    const plusButton = overlay.querySelector('.wgc-stat-container button');
    plusButton.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    const classSelect = overlay.querySelector('select');
    classSelect.value = 'Social Scientist';
    classSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const remainingDiv = Array.from(overlay.querySelectorAll('div')).find(d => d.textContent.startsWith('Points left'));
    expect(remainingDiv.textContent).toBe('Points left: 5');

    const firstName = overlay.querySelector('input[placeholder="First Name (required)"]');
    firstName.value = 'Test';
    const confirmButton = Array.from(overlay.querySelectorAll('button')).find(b => b.textContent === 'Confirm');
    confirmButton.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    const member = ctx.warpGateCommand.teams[0][1];
    expect(member.classType).toBe('Social Scientist');
    expect(member.power).toBe(0);
    expect(member.athletics).toBe(0);
    expect(member.wit).toBe(2);
  });
});
