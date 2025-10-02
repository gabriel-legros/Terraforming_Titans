const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('research button enabling when revealed', () => {
  test('button is enabled once visible even if unaffordable', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = () => '';
    ctx.canAffordResearch = () => false;
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + researchUICode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory; this.updateResearchUI = updateResearchUI;', ctx);

    const params = {
      energy: [
        { id: 'a', name: 'A', description: 'A', cost: { research: 100 }, prerequisites: [], effects: [] },
        { id: 'b', name: 'B', description: 'B', cost: { research: 200 }, prerequisites: [], effects: [] },
        { id: 'c', name: 'C', description: 'C', cost: { research: 300 }, prerequisites: [], effects: [] },
        { id: 'd', name: 'D', description: 'D', cost: { research: 400 }, prerequisites: [], effects: [] }
      ],
      industry: [],
      colonization: [],
      terraforming: [],
      advanced: []
    };

    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');

    const buttons = dom.window.document.querySelectorAll('.research-button');
    expect(buttons[3].textContent).toBe('???');
    expect(buttons[3].disabled).toBe(true);

    ctx.canAffordResearch = () => true;
    ctx.researchManager.completeResearch('a');
    ctx.canAffordResearch = () => false;
    ctx.updateResearchUI();
    const buttonsAfter = dom.window.document.querySelectorAll('.research-button');

    expect(buttonsAfter[3].textContent).toBe('D');
    expect(buttonsAfter[3].disabled).toBe(false);
  });
});
