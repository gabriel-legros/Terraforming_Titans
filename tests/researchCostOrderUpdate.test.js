const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('research order updates with cost', () => {
  test('researches are sorted by cost', () => {
    const ctx = { EffectableEntity: require('../src/js/effectable-entity.js') };
    vm.createContext(ctx);
    vm.runInContext(researchCode + '; this.ResearchManager = ResearchManager;', ctx);

    const params = {
      energy: [
        { id: 'a', name: 'A', description: '', cost: { research: 200 }, prerequisites: [], effects: [] },
        { id: 'b', name: 'B', description: '', cost: { research: 100 }, prerequisites: [], effects: [] }
      ],
      industry: [],
      colonization: [],
      terraforming: [],
      advanced: []
    };

    const manager = new ctx.ResearchManager(params);
    const order = manager.getResearchesByCategory('energy').map(r => r.id);
    expect(order).toEqual(['b', 'a']);
  });

  test('ui reorders when cost changes', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="energy-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.canAffordResearch = () => true;
    ctx.formatNumber = () => '';
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + researchUICode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory; this.updateResearchUI = updateResearchUI;', ctx);

    const params = {
      energy: [
        { id: 'a', name: 'A', description: '', cost: { research: 100 }, prerequisites: [], effects: [] },
        { id: 'b', name: 'B', description: '', cost: { research: 200 }, prerequisites: [], effects: [] }
      ],
      industry: [],
      colonization: [],
      terraforming: [],
      advanced: []
    };

    ctx.researchManager = new ctx.ResearchManager(params);
    ctx.loadResearchCategory('energy');

    let ids = Array.from(dom.window.document.querySelectorAll('.research-button')).map(b => b.id);
    expect(ids).toEqual(['research-a', 'research-b']);

    ctx.researchManager.addAndReplace({
      target: 'researchManager',
      targetId: 'b',
      type: 'researchCostMultiplier',
      value: 0.1,
      effectId: 'e',
      sourceId: 'e'
    });

    ctx.updateResearchUI();
    ids = Array.from(dom.window.document.querySelectorAll('.research-button')).map(b => b.id);
    expect(ids[0]).toBe('research-b');
  });
});
