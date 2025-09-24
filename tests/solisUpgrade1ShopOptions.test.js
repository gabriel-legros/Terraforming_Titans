const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const solisCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/solis.js'), 'utf8');
const solisUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js/solisUI.js'), 'utf8');
const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;

describe('solisUpgrade1 shop options', () => {
  test('options hidden until flag set', () => {
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
    vm.runInContext(`${solisCode}\n${solisUICode}; this.SolisManager = SolisManager;`, ctx);
    ctx.resources = { colony: { research: { value: 0, hasCap: false, increase(v){ this.value += v; } } } };
    ctx.solisManager = new ctx.SolisManager();
    ctx.initializeSolisUI();
    expect(dom.window.document.querySelector('#solis-shop-research-button')).toBeNull();
    expect(dom.window.document.querySelector('#solis-shop-advancedOversight-button')).toBeNull();
    ctx.solisManager.booleanFlags.add('solisUpgrade1');
    ctx.updateSolisUI();
    const researchButton = dom.window.document.querySelector('#solis-shop-research-button');
    const advButton = dom.window.document.querySelector('#solis-shop-advancedOversight-button');
    expect(researchButton).not.toBeNull();
    expect(advButton).not.toBeNull();
    expect(dom.window.document.getElementById('solis-research-shop-items').contains(advButton)).toBe(true);
    expect(dom.window.document.getElementById('solis-shop-items').contains(advButton)).toBe(false);
  });

  test('terraforming measurements upgrade appears with flag', () => {
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
    vm.runInContext(`${solisCode}\n${solisUICode}; this.SolisManager = SolisManager;`, ctx);
    ctx.solisManager = new ctx.SolisManager();
    ctx.researchManager = { completeResearchInstant: jest.fn() };
    ctx.resources = { colony: { research: { value: 0, hasCap: false, increase() {} } }, special: {} };
    ctx.solisManager.booleanFlags.add('solisTerraformingMeasurements');
    ctx.initializeSolisUI();
    ctx.updateSolisUI();
    const button = dom.window.document.querySelector('#solis-shop-terraformingMeasurements-button');
    expect(button).not.toBeNull();
    ctx.solisManager.solisPoints = 300;
    expect(ctx.solisManager.purchaseUpgrade('terraformingMeasurements')).toBe(true);
    expect(ctx.researchManager.completeResearchInstant).toHaveBeenCalledWith('terraforming_sensor');
    expect(ctx.solisManager.purchaseUpgrade('terraformingMeasurements')).toBe(false);
  });

  test('purchase research adds points', () => {
    const { SolisManager } = require('../src/js/solis.js');
    const manager = new SolisManager();
    global.resources = { colony: { research: { value: 0, hasCap: false, increase(v){ this.value += v; } } } };
    manager.solisPoints = 10;
    expect(manager.purchaseUpgrade('research')).toBe(true);
    expect(manager.solisPoints).toBe(0);
    expect(global.resources.colony.research.value).toBe(100);
  });

  test('purchase advanced oversight sets flag', () => {
    const { SolisManager } = require('../src/js/solis.js');
    const manager = new SolisManager();
    global.addEffect = jest.fn();
    manager.solisPoints = 1000;
    expect(manager.purchaseUpgrade('advancedOversight')).toBe(true);
    expect(global.addEffect).toHaveBeenCalledWith({
      target: 'project',
      targetId: 'spaceMirrorFacility',
      type: 'booleanFlag',
      flagId: 'advancedOversight',
      value: true,
      effectId: 'solisAdvancedOversight',
      sourceId: 'solisShop'
    });
    manager.solisPoints = 2000;
    expect(manager.purchaseUpgrade('advancedOversight')).toBe(false);
  });

  test('terraforming measurements upgrade completes research permanently', () => {
    const { SolisManager } = require('../src/js/solis.js');
    const manager = new SolisManager();
    manager.solisPoints = 300;
    global.researchManager = { completeResearchInstant: jest.fn() };
    expect(manager.purchaseUpgrade('terraformingMeasurements')).toBe(true);
    expect(global.researchManager.completeResearchInstant).toHaveBeenCalledWith('terraforming_sensor');
    expect(manager.solisPoints).toBe(0);
    expect(manager.purchaseUpgrade('terraformingMeasurements')).toBe(false);
    delete global.researchManager;
  });
});
