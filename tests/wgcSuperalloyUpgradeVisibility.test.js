const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

describe('WGC superalloy upgrade visibility', () => {
  test('upgrade appears only after superalloy research', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="wgc-hope"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.EffectableEntity = EffectableEntity;
    ctx.WarpGateCommand = require('../src/js/wgc.js').WarpGateCommand;
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'wgcUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    ctx.warpGateCommand = new ctx.WarpGateCommand();
    ctx.researchManager = { isBooleanFlagSet: () => false };
    ctx.initializeWGCUI();
    ctx.updateWGCUI();
    const item = dom.window.document.getElementById('wgc-superalloyEfficiency-button').parentElement;
    expect(item.classList.contains('hidden')).toBe(true);
    ctx.warpGateCommand.rdUpgrades.superalloyEfficiency.enabled = true;
    ctx.updateWGCUI();
    expect(item.classList.contains('hidden')).toBe(true);
    ctx.researchManager.isBooleanFlagSet = f => f === 'superalloyResearchUnlocked';
    ctx.updateWGCUI();
    expect(item.classList.contains('hidden')).toBe(false);
  });
});
