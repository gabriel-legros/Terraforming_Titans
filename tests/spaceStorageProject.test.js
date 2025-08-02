const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Space Storage project', () => {
  test('defined in parameters', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.spaceStorage;
    expect(project).toBeDefined();
    expect(project.type).toBe('SpaceStorageProject');
    expect(project.category).toBe('mega');
    expect(project.cost.colony.metal).toBe(1_000_000_000_000);
    expect(project.duration).toBe(300000);
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(Infinity);
  });

  test('scales with terraformed worlds and saves used storage', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {},
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: { getTerraformedPlanetCount: () => 2 }
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const baseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'TerraformingDurationProject.js'), 'utf8');
    vm.runInContext(baseCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 300000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: {} };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    expect(project.getBaseDuration()).toBeCloseTo(100000);
    project.repeatCount = 2;
    expect(project.maxStorage).toBe(2000000000000);
    project.usedStorage = 1234;
    const saved = project.saveState();
    const loaded = new ctx.SpaceStorageProject(params, 'spaceStorage');
    loaded.loadState(saved);
    expect(loaded.usedStorage).toBe(1234);
  });
});
