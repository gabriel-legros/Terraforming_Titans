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
        energy: {
          value: 1000,
          productionRate: 0,
          consumptionRate: 0,
          decrease(v){ this.value -= v; },
          updateStorageCap: () => {}
        }
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
    ctx.resources.colony.energy.productionRate = 0;
    project.update(1000); // deduct one second of sustain cost
    expect(ctx.resources.colony.energy.value).toBeCloseTo(990);
    project.update(1000); // deduct another second of sustain cost
    expect(ctx.resources.colony.energy.value).toBeCloseTo(980);
    expect(project.isActive).toBe(true);
    ctx.resources.colony.energy.value = 5; // insufficient for next second
    project.update(1000); // not enough energy -> pause
    expect(project.isPaused).toBe(true);
    expect(project.isActive).toBe(false);
  });

  test('uses production to cover sustain cost without consuming storage', () => {
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
    ctx.resources.colony.energy.value = 0;
    ctx.resources.colony.energy.productionRate = 10;
    ctx.resources.colony.energy.consumptionRate = 0;
    project.update(1000);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(0);
    expect(project.isPaused).toBe(false);
    expect(project.isActive).toBe(true);
  });

  test('draws remaining sustain cost from storage', () => {
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
    ctx.resources.colony.energy.value = 20;
    ctx.resources.colony.energy.productionRate = 6;
    ctx.resources.colony.energy.consumptionRate = 0;
    project.update(1000);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(16);
    expect(project.isPaused).toBe(false);
    expect(project.isActive).toBe(true);
  });
});
