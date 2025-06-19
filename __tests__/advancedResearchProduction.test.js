const fs = require('fs');
const path = require('path');
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'research.js'), 'utf8');

describe('advanced research production', () => {
  test('produces per terraformed planet', () => {
    const ctx = {
      resources: {
        colony: {
          advancedResearch: {
            value: 0,
            unlocked: true,
            cap: Infinity,
            increase(amount) { this.value += amount; },
            modifyRate: jest.fn()
          }
        }
      },
      spaceManager: {
        planetStatuses: {
          mars: { terraformed: true },
          venus: { terraformed: true },
          titan: { terraformed: false }
        }
      },
      buildings: {},
      colonies: {},
      projectManager: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager;', ctx);

    const manager = new ctx.ResearchManager({});
    ctx.researchManager = manager;

    manager.update(1000);

    expect(ctx.resources.colony.advancedResearch.value).toBe(2);
    expect(ctx.resources.colony.advancedResearch.modifyRate).toHaveBeenCalledWith(2, 'Research Manager', 'research');
  });
});
