const fs = require('fs');
const path = require('path');
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');

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
        getTerraformedPlanetCount: jest.fn().mockReturnValue(2)
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

    expect(ctx.spaceManager.getTerraformedPlanetCount).toHaveBeenCalled();
    expect(ctx.resources.colony.advancedResearch.value).toBe(2);
    expect(ctx.resources.colony.advancedResearch.modifyRate).toHaveBeenCalledWith(2, 'Research Manager', 'research');
  });
});
