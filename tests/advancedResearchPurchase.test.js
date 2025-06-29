const fs = require('fs');
const path = require('path');
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');

describe('advanced research purchase', () => {
  test('deducts advanced research points when completed', () => {
    const ctx = {
      resources: { colony: { research: { value: 0 }, advancedResearch: { value: 6000 } } },
      buildings: {}, colonies: {}, projectManager: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
    };
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager;', ctx);

    const manager = new ctx.ResearchManager({
      advanced: [{ id: 'adv1', name: 'Adv', description: '', cost: { advancedResearch: 5000 }, prerequisites: [], effects: [] }]
    });
    ctx.researchManager = manager;

    manager.completeResearch('adv1');

    expect(ctx.resources.colony.advancedResearch.value).toBe(1000);
    expect(manager.getResearchById('adv1').isResearched).toBe(true);
  });
});
