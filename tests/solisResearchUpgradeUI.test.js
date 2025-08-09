const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');
const researchParameters = require('../src/js/research-parameters.js');

describe('Solis research upgrade UI', () => {
  test('lists technologies and crosses out purchased ones', () => {
    const html = `<!DOCTYPE html><div id="solis-research-shop" class="solis-shop"><div id="solis-research-shop-items"></div></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.window = dom.window;
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.researchParameters = researchParameters;

    const manager = new SolisManager();
    manager.isBooleanFlagSet = () => true;
    ctx.solisManager = manager;
    ctx.resources = { colony: { alienArtifact: { value: 0 } } };
    const rm = { completeResearchInstant() {} };
    global.researchManager = rm;
    ctx.researchManager = rm;

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'solisUI.js'), 'utf8');
    vm.runInContext(uiCode, ctx);
    ctx.initializeSolisUI();
    ctx.updateSolisUI();

    const items = dom.window.document.querySelectorAll('.solis-research-list li');
    expect(items.length).toBe(manager.getResearchUpgradeOrder().length);
    expect(items[0].textContent).toBe('Launch Pads');

    manager.solisPoints = 100;
    manager.purchaseUpgrade('researchUpgrade');
    ctx.updateSolisUI();

    const updated = dom.window.document.querySelectorAll('.solis-research-list li');
    expect(updated[0].classList.contains('solis-research-completed')).toBe(true);
    expect(updated[1].classList.contains('solis-research-completed')).toBe(false);
  });
});

