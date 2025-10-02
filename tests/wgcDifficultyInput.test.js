const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC difficulty input', () => {
  test('changing the selector stores difficulty value', () => {
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
    const input = dom.window.document.querySelector('.difficulty-input');
    input.value = '2';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    ctx.updateWGCUI();
    expect(ctx.warpGateCommand.operations[0].difficulty).toBe(2);
    expect(dom.window.document.querySelector('.difficulty-input').value).toBe('2');
  });
});
