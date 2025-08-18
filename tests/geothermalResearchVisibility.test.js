const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('geothermal research visibility', () => {
  test('hidden when no geothermal deposits', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.canAffordResearch = () => true;
    ctx.formatNumber = () => '';
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    ctx.currentPlanetParameters = { resources: { underground: { geothermal: { initialValue: 0, maxDeposits: 0 } } } };
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + uiCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory;', ctx);

    const params = { energy: [ { id: 'geo', name: 'Geo', description: '', cost: { research: 100 }, requiresGeothermal: true, requiredFlags: [], effects: [] } ], industry: [], colonization: [], terraforming: [], advanced: [] };
    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');
    const ids = Array.from(dom.window.document.querySelectorAll('.research-button')).map(b => b.id);
    expect(ids.length).toBe(0);
  });

  test('visible with geothermal deposits', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.canAffordResearch = () => true;
    ctx.formatNumber = () => '';
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    ctx.currentPlanetParameters = { resources: { underground: { geothermal: { initialValue: 1, maxDeposits: 1 } } } };
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + uiCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory;', ctx);

    const params = { energy: [ { id: 'geo', name: 'Geo', description: '', cost: { research: 100 }, requiresGeothermal: true, requiredFlags: [], effects: [] } ], industry: [], colonization: [], terraforming: [], advanced: [] };
    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');
    const ids = Array.from(dom.window.document.querySelectorAll('.research-button')).map(b => b.id);
    expect(ids).toEqual(['research-geo']);
  });
});
