const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Mega project space storage integration', () => {
  test('Dyson Swarm project can use space storage attribute', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    expect(ctx.projectParameters.dysonSwarmReceiver.attributes.canUseSpaceStorage).toBe(true);
  });

  test('Project uses space storage resources when available', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: { colony: { metal: { value: 20, decrease(v){ this.value -= v; } } } },
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      projectManager: { projects: { spaceStorage: { resourceUsage: { metal: 50 }, usedStorage: 50, prioritizeMegaProjects: false } } }
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const params = { name: 'testProj', category: 'mega', cost: { colony: { metal: 60 } }, duration: 1000, description: '', unlocked: true, attributes: { canUseSpaceStorage: true } };
    const project = new ctx.Project(params, 'testProj');
    const started = project.start(ctx.resources);
    expect(started).toBe(true);
    expect(ctx.resources.colony.metal.value).toBe(0);
    expect(ctx.projectManager.projects.spaceStorage.resourceUsage.metal).toBe(10);
    expect(ctx.projectManager.projects.spaceStorage.usedStorage).toBe(10);
  });

  test('Prioritizing space storage spends storage first', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: { colony: { metal: { value: 50, decrease(v){ this.value -= v; } } } },
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      projectManager: { projects: { spaceStorage: { resourceUsage: { metal: 60 }, usedStorage: 60, prioritizeMegaProjects: true } } }
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const params = { name: 'testProj', category: 'mega', cost: { colony: { metal: 70 } }, duration: 1000, description: '', unlocked: true, attributes: { canUseSpaceStorage: true } };
    const project = new ctx.Project(params, 'testProj');
    const started = project.start(ctx.resources);
    expect(started).toBe(true);
    expect(ctx.projectManager.projects.spaceStorage.resourceUsage.metal).toBeUndefined();
    expect(ctx.projectManager.projects.spaceStorage.usedStorage).toBe(0);
    expect(ctx.resources.colony.metal.value).toBe(40);
  });
});
