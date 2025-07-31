const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC class description', () => {
  test('description updates when class changes', () => {
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
    ctx.openRecruitDialog(0, 1, null);

    const select = dom.window.document.querySelector('.wgc-popup-window select');
    const desc = dom.window.document.querySelector('.wgc-class-description');

    expect(desc.textContent).toMatch(/Combat/i);

    select.value = 'Natural Scientist';
    select.dispatchEvent(new dom.window.Event('change'));

    expect(desc.textContent).toMatch(/twice the Alien artifacts/i);
  });
});

