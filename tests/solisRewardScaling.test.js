const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis quest reward scaling', () => {
  test('multiplies reward by sqrt of terraformed worlds and displays two decimals', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <span id="solis-points-value"></span>
      <span id="solis-reward"></span>
      <div id="solis-quest-message"></div>
      <div id="solis-quest-detail"><span id="solis-quest-quantity"></span><span id="solis-quest-resource"></span></div>
      <button id="solis-refresh-button"></button>
      <button id="solis-complete-button"></button>
      <div id="solis-cooldown"></div>
      <span id="solis-cooldown-text"></span>
      <div id="solis-cooldown-bar"></div>
      <div id="solis-donation-section"></div>
      <span id="solis-donation-count"></span>
      <input id="solis-donation-input" value="0" />
      <button id="solis-donation-button"></button>
      <div id="solis-research-shop"></div>
    `, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.solisManager = new SolisManager();
    ctx.solisManager.currentQuest = { resource: 'metal', quantity: 5 };
    ctx.resources = { colony: { metal: { value: 10, decrease(q){ this.value -= q; }, unlocked: true } } };
    global.resources = ctx.resources;
    global.spaceManager = { getTerraformedPlanetCount: () => 2 };
    ctx.spaceManager = global.spaceManager;

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'solisUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);
    ctx.updateSolisUI();

    const expected = numbers.formatNumber(Math.sqrt(2), false, 2);
    expect(dom.window.document.getElementById('solis-reward').textContent).toBe(expected);

    ctx.solisManager.completeQuest();
    expect(ctx.solisManager.solisPoints).toBeCloseTo(Math.sqrt(2));
  });
});
