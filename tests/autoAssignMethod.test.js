const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('autoAssign method usage', () => {
  test('ProjectManager calls autoAssign when updating', () => {
    const ctx = {
      console,
      EffectableEntity,
      document: { getElementById: () => null },
      resources: {
        colony: { metal: { value: 0, updateStorageCap: () => {} } },
        special: { spaceships: { value: 3 } }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      populationModule: {},
      tabManager: {},
      fundingModule: {},
      terraforming: {},
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {},
      globalEffects: new EffectableEntity({ description: 'global' })
    };
    vm.createContext(ctx);

    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);

    ctx.assignSpaceshipsToProject = jest.fn((project, count) => {
      project.assignedSpaceships += count;
      ctx.resources.special.spaceships.value -= count;
    });
    ctx.global = ctx;
    ctx.resources.special.spaceships.value = 3;
    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.projects.test = new ctx.SpaceshipProject({
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { spaceMining: true, costPerShip: {}, resourceGainPerShip: {} }
    }, 'test');
    ctx.projectManager.projects.test.autoAssignSpaceships = true;

    ctx.projectManager.updateProjects(0);

    expect(ctx.assignSpaceshipsToProject).toHaveBeenCalled();
    expect(ctx.projectManager.projects.test.assignedSpaceships).toBe(3);
    expect(ctx.resources.special.spaceships.value).toBe(0);
  });
});
