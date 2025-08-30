const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('project sustain cost rates', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(code + '; this.Project = Project;', ctx);
    ctx.resources = {
      colony: {
        energy: {
          value: 100,
          productionRate: 0,
          consumptionRate: 0,
          decrease(v){ this.value -= v; },
          updateStorageCap: () => {},
          modifyRate: jest.fn()
        }
      }
    };
    global.resources = ctx.resources;
  });

  test('sustain consumption updates resource rates', () => {
    const config = {
      name: 'Test',
      category: 'story',
      cost: { colony: { energy: 0 } },
      sustainCost: { colony: { energy: 10 } },
      duration: 1000,
      description: '',
      repeatable: false,
      unlocked: true
    };
    const project = new ctx.Project(config, 'test');
    project.start(ctx.resources);
    project.update(1000);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(90);
    expect(ctx.resources.colony.energy.modifyRate).toHaveBeenCalledWith(-10, 'Test', 'project');
  });
});
