const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('colonist cap handling', () => {
  function setup(popVal) {
    const ctx = { console, EffectableEntity };
    ctx.resources = {
      colony: {
        colonists: {
          value: popVal,
          cap: 100,
          modifyRate: jest.fn(),
          increase(v) { this.value += v; },
          decrease(v) { this.value -= v; }
        },
        workers: { value: 0, cap: 0 },
        androids: { value: 0, cap: 0 }
      }
    };
    ctx.buildings = {};
    ctx.colonies = {
      base: {
        active: 1,
        storage: { colony: { colonists: 100 } },
        happiness: 0.5
      }
    };
    ctx.projectManager = {
      getAssignedAndroids: () => 0,
      forceUnassignAndroids: () => {}
    };
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'population.js'), 'utf8');
    vm.runInContext(code + '; this.PopulationModule = PopulationModule;', ctx);
    const module = new ctx.PopulationModule(ctx.resources, { workerRatio: 0.5 });
    return { ctx, module };
  }

  test('cropped when slightly over cap', () => {
    const { ctx, module } = setup(100.005);
    module.updatePopulation(1000);
    expect(ctx.resources.colony.colonists.value).toBeCloseTo(100);
    expect(ctx.resources.colony.colonists.modifyRate).not.toHaveBeenCalled();
  });

  test('decays when noticeably over cap', () => {
    const { ctx, module } = setup(101);
    module.updatePopulation(1000);
    expect(ctx.resources.colony.colonists.value).toBeLessThan(100);
  });
});
