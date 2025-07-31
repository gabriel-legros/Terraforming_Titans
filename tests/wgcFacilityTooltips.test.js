const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;

describe('WGC facility tooltips', () => {
  test('each facility has a descriptive tooltip', () => {
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
    const items = dom.window.document.querySelectorAll('#wgc-facilities-menu .wgc-rd-item');
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      const label = item.querySelector('.wgc-rd-label');
      const icon = label.querySelector('.info-tooltip-icon');
      expect(icon).not.toBeNull();
      const title = icon.getAttribute('title');
      expect(title).toMatch(/% per level/);
    });
  });
});
