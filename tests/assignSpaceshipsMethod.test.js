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
});
