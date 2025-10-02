const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('SpaceshipProject.assignSpaceships', () => {
  test('updates assigned ships and resource count', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = { special: { spaceships: { value: 5 } } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);

    global.resources = ctx.resources;
    const config = {
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { spaceMining: true }
    };
    const project = new ctx.SpaceshipProject(config, 'test');

    project.assignSpaceships(3);
    expect(project.assignedSpaceships).toBe(3);
    expect(ctx.resources.special.spaceships.value).toBe(2);

    project.assignSpaceships(-10);
    expect(project.assignedSpaceships).toBe(0);
    expect(ctx.resources.special.spaceships.value).toBe(5);
  });

  test('borrows ships from auto-assigned project when needed', () => {
    const ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = { special: { spaceships: { value: 5 } } };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);

    const config = {
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { spaceMining: true }
    };

    const previousManager = ctx.projectManager;
    const previousElements = ctx.projectElements;
    vm.runInContext('let projectManager = { projects: {} };', ctx);
    ctx.projectElements = {};

    const autoProject = new ctx.SpaceshipProject(config, 'auto');
    const manualProject = new ctx.SpaceshipProject(config, 'manual');
    autoProject.autoAssignSpaceships = true;

    ctx.autoProject = autoProject;
    ctx.manualProject = manualProject;
    vm.runInContext('projectManager.projects.auto = autoProject;', ctx);
    vm.runInContext('projectManager.projects.manual = manualProject;', ctx);
    delete ctx.projectManager;

    autoProject.assignSpaceships(4);
    expect(autoProject.assignedSpaceships).toBe(4);
    expect(ctx.resources.special.spaceships.value).toBe(1);

    manualProject.assignSpaceships(3);
    expect(manualProject.assignedSpaceships).toBe(3);
    expect(autoProject.assignedSpaceships).toBe(2);
    expect(ctx.resources.special.spaceships.value).toBe(0);

    delete ctx.autoProject;
    delete ctx.manualProject;

    if (previousManager !== undefined) {
      ctx.projectManager = previousManager;
    } else {
      delete ctx.projectManager;
    }
    ctx.projectElements = previousElements;
  });
});
