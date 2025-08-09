const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Chapter 13.2 Solis reward alert', () => {
  test('shows alert once and clears when viewed', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="hope-tab"><span id="hope-alert" class="hope-alert">!</span></div>
      <div class="hope-subtab" data-subtab="solis-hope">Solis<span id="solis-subtab-alert" class="hope-alert">!</span></div>
      <div id="solis-hope" class="hope-subtab-content"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.solisManager = new SolisManager();
    ctx.solisTabVisible = true;
    ctx.initializeSkillsUI = () => {};
    ctx.initializeSolisUI = () => {};
    ctx.initializeWGCUI = () => {};
    ctx.updateSkillTreeUI = () => {};
    ctx.updateSolisUI = () => {};
    ctx.updateWGCVisibility = () => {};
    ctx.updateWGCUI = () => {};
    const hopeCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'hopeUI.js'), 'utf8');
    vm.runInContext(hopeCode, ctx);

    ctx.initializeHopeUI();
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('solis-subtab-alert').style.display).toBe('none');

    ctx.solisManager.addAndReplace({ type: 'solisTabAlert', value: true });
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('solis-subtab-alert').style.display).toBe('inline');

    ctx.solisManager.setSolisTabAlert(false);
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('solis-subtab-alert').style.display).toBe('none');
  });
});
