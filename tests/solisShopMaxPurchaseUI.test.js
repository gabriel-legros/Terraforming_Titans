const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;

describe('solis shop max purchase UI', () => {
  test('hides cost and button after max purchase', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="solis-shop-items"></div>
      <div id="solis-donation-items"></div>
      <div id="solis-research-shop-items"></div>
      <div id="solis-quest-text"></div>
      <div id="solis-cooldown"></div>
      <div id="solis-donation-section"></div>
      <div id="solis-research-shop"></div>
      <button id="solis-refresh-button"></button>
      <button id="solis-complete-button"></button>
      <span id="solis-points-value"></span>
      <span id="solis-reward"></span>
      <span id="solis-cooldown-text"></span>
      <div id="solis-cooldown-bar"></div>
      <span id="solis-donation-count"></span>
      <input id="solis-donation-input" />
      <button id="solis-donation-button"></button>
    `, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    const solisCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/solis.js'), 'utf8');
    const solisUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js/solisUI.js'), 'utf8');
    vm.runInContext(`${solisCode}\n${solisUICode}; this.SolisManager = SolisManager;`, ctx);

    ctx.solisManager = new ctx.SolisManager();
    ctx.solisManager.booleanFlags.add('solisUpgrade1');
    ctx.solisManager.booleanFlags.add('solisAlienArtifactUpgrade');
    ctx.resources = { colony: { research: { value: 0, hasCap: false, increase() {} } } };
    ctx.researchManager = { completeResearchInstant() {} };
    ctx.addEffect = () => {};

    ctx.initializeSolisUI();
    ctx.updateSolisUI();

    ctx.solisManager.solisPoints = 5000;
    ctx.solisManager.purchaseUpgrade('advancedOversight');
    const max = ctx.solisManager.shopUpgrades.researchUpgrade.max;
    for (let i = 0; i < max; i++) {
      ctx.solisManager.purchaseUpgrade('researchUpgrade');
    }
    ctx.updateSolisUI();

    const advButton = dom.window.document.getElementById('solis-shop-advancedOversight-button');
    const advCost = dom.window.document.getElementById('solis-shop-advancedOversight-cost').parentElement;
    expect(advButton.classList.contains('hidden')).toBe(true);
    expect(advCost.classList.contains('hidden')).toBe(true);

    const resButton = dom.window.document.getElementById('solis-shop-researchUpgrade-button');
    const resCost = dom.window.document.getElementById('solis-shop-researchUpgrade-cost').parentElement;
    expect(resButton.classList.contains('hidden')).toBe(true);
    expect(resCost.classList.contains('hidden')).toBe(true);
  });
});
