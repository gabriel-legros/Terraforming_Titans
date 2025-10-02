const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('research visibility skips unavailable items', () => {
  test('shows next three displayable researches when first requires methane', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = () => '';
    ctx.canAffordResearch = () => true;
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    ctx.currentPlanetParameters = { resources: { surface: { liquidMethane: { initialValue: 0 }, hydrocarbonIce: { initialValue: 0 } }, atmospheric: { atmosphericMethane: { initialValue: 0 } } } };
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + researchUICode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory; this.updateResearchUI = updateResearchUI;', ctx);

    const params = {
      energy: [
        { id: 'methane', name: 'Methane', description: '', cost: { research: 100 }, prerequisites: [], effects: [], requiresMethane: true },
        { id: 'a', name: 'A', description: 'A', cost: { research: 200 }, prerequisites: [], effects: [] },
        { id: 'b', name: 'B', description: 'B', cost: { research: 300 }, prerequisites: [], effects: [] },
        { id: 'c', name: 'C', description: 'C', cost: { research: 400 }, prerequisites: [], effects: [] }
      ],
      industry: [],
      colonization: [],
      terraforming: [],
      advanced: []
    };

    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');
    const buttons = dom.window.document.querySelectorAll('.research-button');
    const texts = Array.from(buttons).map(b => b.textContent);
    expect(texts).toEqual(['A', 'B', 'C']);
  });
});
