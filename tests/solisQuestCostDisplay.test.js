const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis quest cost display', () => {
  test('formats quest quantity with formatNumber', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="solis-quest-text"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.solisManager = new SolisManager();
    ctx.solisManager.currentQuest = { resource: 'metal', quantity: 1500 };
    ctx.resources = { colony: { metal: { value: 2000 } } };

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'solisUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);

    ctx.updateSolisUI();

    const html = dom.window.document.getElementById('solis-quest-text').innerHTML;
    expect(html).toContain(numbers.formatNumber(1500, true));
  });
});
