const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('stopHidingRegular flag shows all researches', () => {
  test('disables regular research visibility limit', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.canAffordResearch = () => true;
    ctx.formatNumber = () => '';
    ctx.resources = { colony: { research: { value: 1000 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + researchUICode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory; this.updateResearchUI = updateResearchUI;', ctx);

    const params = {
      energy: [
        { id: 'a', name: 'A', description: 'A desc', cost: { research: 100 }, prerequisites: [], effects: [] },
        { id: 'b', name: 'B', description: 'B desc', cost: { research: 200 }, prerequisites: [], effects: [] },
        { id: 'c', name: 'C', description: 'C desc', cost: { research: 300 }, prerequisites: [], effects: [] },
        { id: 'd', name: 'D', description: 'D desc', cost: { research: 400 }, prerequisites: [], effects: [] }
      ],
      industry: [],
      colonization: [],
      terraforming: [],
      advanced: []
    };

    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');

    let buttons = dom.window.document.querySelectorAll('.research-button');
    let costs = dom.window.document.querySelectorAll('.research-cost');
    let descs = dom.window.document.querySelectorAll('.research-description');

    expect(buttons[3].textContent).toBe('???');
    expect(costs[3].textContent).toBe('Cost: ???');
    expect(descs[3].textContent).toBe('???');

    ctx.researchManager.addAndReplace({ type: 'booleanFlag', flagId: 'stopHidingRegular', value: true });
    ctx.updateResearchUI();

    buttons = dom.window.document.querySelectorAll('.research-button');
    costs = dom.window.document.querySelectorAll('.research-cost');
    descs = dom.window.document.querySelectorAll('.research-description');

    expect(buttons[3].textContent).toBe('D');
    expect(costs[3].textContent).toBe('Cost:  Research Points');
    expect(descs[3].textContent).toBe('D desc');
  });
});
