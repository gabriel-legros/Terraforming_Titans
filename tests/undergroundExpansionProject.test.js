const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Underground Land Expansion project', () => {
  const projectsPath = path.join(__dirname, '..', 'src/js', 'projects.js');
  const androidPath = path.join(__dirname, '..', 'src/js/projects', 'AndroidProject.js');
  const ugPath = path.join(__dirname, '..', 'src/js/projects', 'UndergroundExpansionProject.js');

  function createContext() {
    const ctx = { console, EffectableEntity };
    ctx.resources = { colony: { androids: { value: 0 } }, surface: { land: { value: 1000, increase(amount){ this.value += amount; } } } };
    ctx.buildings = { oreMine: { count: 1 } };
    ctx.terraforming = { initialLand: 1000 };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(projectsPath, 'utf8') + '; this.Project = Project;', ctx);
    vm.runInContext(fs.readFileSync(androidPath, 'utf8') + '; this.AndroidProject = AndroidProject;', ctx);
    vm.runInContext(fs.readFileSync(ugPath, 'utf8') + '; this.UndergroundExpansionProject = UndergroundExpansionProject;', ctx);
    return ctx;
  }

  test('can start without androids', () => {
    const ctx = createContext();
    const config = { name: 'undergroundExpansion', category: 'infrastructure', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: 1000, unlocked: true, attributes: {} };
    const project = new ctx.UndergroundExpansionProject(config, 'undergroundExpansion');
    project.booleanFlags.add('androidAssist');
    expect(project.canStart()).toBe(true);
    expect(project.getAndroidSpeedMultiplier()).toBe(1);
  });

  test('completion increases land by 1/1000 of initial land', () => {
    const ctx = createContext();
    const config = { name: 'undergroundExpansion', category: 'infrastructure', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: 1000, unlocked: true, attributes: {} };
    const project = new ctx.UndergroundExpansionProject(config, 'undergroundExpansion');
    project.complete();
    expect(ctx.resources.surface.land.value).toBeCloseTo(1001, 5);
    expect(project.repeatCount).toBe(1);
  });

  test('cannot start after reaching max repeat count', () => {
    const ctx = createContext();
    const config = { name: 'undergroundExpansion', category: 'infrastructure', cost: {}, duration: 1, description: '', repeatable: true, maxRepeatCount: 1000, unlocked: true, attributes: {} };
    const project = new ctx.UndergroundExpansionProject(config, 'undergroundExpansion');
    project.repeatCount = 1000;
    expect(project.canStart()).toBe(false);
  });
});
