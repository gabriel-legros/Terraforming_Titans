const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

describe('WGC difficulty label', () => {
  test('label displayed above selector', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="wgc-hope"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.EffectableEntity = EffectableEntity;
    ctx.WarpGateCommand = require('../src/js/wgc.js').WarpGateCommand;
    ctx.WGCTeamMember = require('../src/js/team-member.js').WGCTeamMember;
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.initializeWGCUI();
    ctx.updateWGCUI();
    const container = dom.window.document.querySelector('.difficulty-container');
    expect(container).not.toBeNull();
    const labelWrapper = container.querySelector('.difficulty-label');
    const input = container.querySelector('input.difficulty-input');
    expect(labelWrapper).not.toBeNull();
    const label = labelWrapper.querySelector('span');
    expect(label.textContent).toBe('Difficulty');
    expect(container.firstElementChild).toBe(labelWrapper);
    expect(container.lastElementChild).toBe(input);
  });
});
