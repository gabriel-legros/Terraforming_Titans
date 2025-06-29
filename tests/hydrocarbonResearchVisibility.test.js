const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('hydrocarbon research visibility', () => {
  test('hidden when no methane', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.canAffordResearch = () => true;
    ctx.formatNumber = () => '';
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    ctx.currentPlanetParameters = { resources: { surface: { liquidMethane: { initialValue: 0 }, hydrocarbonIce: { initialValue: 0 } }, atmospheric: { atmosphericMethane: { initialValue: 0 } } } };
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + uiCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory;', ctx);

    const params = { energy: [ { id: 'hydrocarbon_generator', name: 'Hydro', description: '', cost: { research: 100 }, requiresMethane: true, requiredFlags: [], effects: [] } ], industry: [], colonization: [], terraforming: [], advanced: [] };
    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');
    const ids = Array.from(dom.window.document.querySelectorAll('.research-button')).map(b => b.id);
    expect(ids.length).toBe(0);
  });

  test('visible with methane', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.canAffordResearch = () => true;
    ctx.formatNumber = () => '';
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    ctx.currentPlanetParameters = { resources: { surface: { liquidMethane: { initialValue: 1 }, hydrocarbonIce: { initialValue: 0 } }, atmospheric: { atmosphericMethane: { initialValue: 0 } } } };
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + uiCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory;', ctx);

    const params = { energy: [ { id: 'hydrocarbon_generator', name: 'Hydro', description: '', cost: { research: 100 }, requiresMethane: true, requiredFlags: [], effects: [] } ], industry: [], colonization: [], terraforming: [], advanced: [] };
    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');
    const ids = Array.from(dom.window.document.querySelectorAll('.research-button')).map(b => b.id);
    expect(ids).toEqual(['research-hydrocarbon_generator']);
  });
});
