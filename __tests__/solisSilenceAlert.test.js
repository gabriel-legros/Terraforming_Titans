const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../solis.js');

describe('silence Solis alert setting', () => {
  test('alert hidden when silenced', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="hope-tab"><span id="hope-alert" class="hope-alert">!</span></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.solisManager = new SolisManager();
    ctx.solisTabVisible = true;
    ctx.gameSettings = { silenceSolisAlert: true };
    ctx.initializeSkillsUI = () => {};
    ctx.initializeSolisUI = () => {};
    ctx.updateSkillTreeUI = () => {};
    ctx.updateSolisUI = () => {};
    const code = fs.readFileSync(path.join(__dirname, '..', 'hopeUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.solisManager.currentQuest = { resource: 'metal', quantity: 5 };
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('none');

    ctx.gameSettings.silenceSolisAlert = false;
    ctx.updateHopeUI();
    expect(dom.window.document.getElementById('hope-alert').style.display).toBe('inline');
  });
});
