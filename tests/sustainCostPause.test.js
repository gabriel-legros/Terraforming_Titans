const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('project sustain cost pause', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(code + '; this.Project = Project;', ctx);
    ctx.resources = {
      colony: {
        energy: { value: 1000, decrease(v){ this.value -= v; }, updateStorageCap: () => {} }
      }
    };
    global.resources = ctx.resources;
  });

  test('pauses when sustain cost not met', () => {
    const config = {
      name: 'Test',
      category: 'story',
      cost: { colony: { energy: 0 } },
      sustainCost: { colony: { energy: 10 } },
      duration: 200000,
      description: '',
      repeatable: false,
      unlocked: true
    };
    const project = new ctx.Project(config, 'test');
    project.start(ctx.resources);
    expect(project.isActive).toBe(true);
    project.update(500);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(995);
    project.update(60000); // consume 600 energy
    expect(project.isActive).toBe(true);
    project.update(40000); // not enough energy -> pause
    expect(project.isPaused).toBe(true);
    expect(project.isActive).toBe(false);
  });
});
