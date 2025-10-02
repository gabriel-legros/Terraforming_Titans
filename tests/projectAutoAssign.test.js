const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('ProjectManager autoAssign uses method', () => {
  let context;
  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
      resources: {
        colony: { metal: { value: 0, updateStorageCap: () => {} } },
        special: { spaceships: { value: 3 } }
      },
      buildings: {},
      colonies: {},
      populationModule: {},
      tabManager: {},
      fundingModule: {},
      terraforming: {},
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {},
      globalEffects: new EffectableEntity({ description: 'global' })
    };
    context.document = { getElementById: () => null };
    vm.createContext(context);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', context);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', context);
    context.projectManager = new context.ProjectManager();
    global.resources = context.resources;
  });

  test('updateProjects calls autoAssign', () => {
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
    const project = new context.SpaceshipProject(config, 'test');
    project.autoAssignSpaceships = true;
    context.projectManager.projects.test = project;
    const spy = jest.spyOn(project, 'autoAssign');
    context.projectManager.updateProjects(0);
    expect(spy).toHaveBeenCalled();
  });
});
