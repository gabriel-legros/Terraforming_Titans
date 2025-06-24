const fs = require('fs');
const path = require('path');

const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../solis.js');

describe('Solis UI multiply button', () => {
  test('increments reward by 1 and multiplies quest quantity by 10', () => {
    const dom = new JSDOM(`<!DOCTYPE html><button id="solis-multiply-button"></button>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.solisManager = new SolisManager();
    ctx.solisManager.currentQuest = { resource: 'metal', quantity: 5 };
    ctx.resources = { colony: { metal: { value: 100 } } };

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'solisUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.initializeSolisUI();
    ctx.initializeSolisUI();

    dom.window.document.getElementById('solis-multiply-button').dispatchEvent(new dom.window.Event('click'));

    expect(ctx.solisManager.rewardMultiplier).toBe(2);
    expect(ctx.solisManager.currentQuest.quantity).toBe(50);
  });
});
