const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('AndroidProject.assignAndroids', () => {
  test('updates assigned androids and resource count', () => {
    const ctx = { console, EffectableEntity };
    ctx.resources = { colony: { androids: { value: 5 } } };
    ctx.buildings = { oreMine: { count: 1 } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);

    global.resources = ctx.resources;
    global.buildings = ctx.buildings;

    const config = {
      name: 'Test',
      category: 'infrastructure',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {}
    };
    const project = new ctx.AndroidProject(config, 'test');

    project.assignAndroids(3);
    expect(project.assignedAndroids).toBe(3);
    expect(ctx.resources.colony.androids.value).toBe(2);

    project.assignAndroids(-10);
    expect(project.assignedAndroids).toBe(0);
    expect(ctx.resources.colony.androids.value).toBe(5);
  });

  test('calculates speed multiplier based on ore mines', () => {
    const ctx = { console, EffectableEntity };
    ctx.resources = { colony: { androids: { value: 1_000_000_000 } } };
    ctx.buildings = { oreMine: { count: 1000 } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);

    global.resources = ctx.resources;
    global.buildings = ctx.buildings;

    const config = {
      name: 'Test',
      category: 'infrastructure',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {}
    };
    const project = new ctx.AndroidProject(config, 'test');
    project.booleanFlags.add('androidAssist');
    project.assignAndroids(1_000_000_000);
    const mult = project.getAndroidSpeedMultiplier();
    expect(mult).toBeCloseTo(1001);
    const duration = project.getBaseDuration();
    expect(duration).toBeCloseTo(0.0999);
  });
});
