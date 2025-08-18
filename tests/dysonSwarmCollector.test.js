const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Dyson Swarm collector behaviour', () => {
  test('collector countdown progresses after update', () => {
    const ctx = {
      console,
      EffectableEntity,
      resources: {
        colony: {
          metal: { value: 5000000, decrease: () => {}, updateStorageCap: () => {} },
          glass: { value: 80000, decrease: () => {}, updateStorageCap: () => {} },
          electronics: { value: 2500000, decrease: () => {}, updateStorageCap: () => {} },
          components: { value: 400000, decrease: () => {}, updateStorageCap: () => {} },
          energy: { value: 0, modifyRate: () => {}, updateStorageCap: () => {} }
        }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const baseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'TerraformingDurationProject.js'), 'utf8');
    vm.runInContext(baseCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    const params = { name: 'dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true, attributes: {} };
    const project = new ctx.DysonSwarmReceiverProject(params, 'dyson');
    project.isCompleted = true;
    ctx.projectManager.projects.dyson = project;

    const started = project.startCollector();
    expect(started).toBe(true);
    expect(project.collectorProgress).toBe(project.collectorDuration);
    ctx.projectManager.updateProjects(1000);
    expect(project.collectorProgress).toBe(project.collectorDuration - 1000);
  });

  test('collector can start before receiver completion', () => {
    const ctx = {
      console,
      EffectableEntity,
      resources: {
        colony: {
          glass: { value: 2000, decrease: () => {}, updateStorageCap: () => {} },
          electronics: { value: 2000, decrease: () => {}, updateStorageCap: () => {} },
          components: { value: 2000, decrease: () => {}, updateStorageCap: () => {} }
        }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const baseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'TerraformingDurationProject.js'), 'utf8');
    vm.runInContext(baseCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);

    const params = { name: 'dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true, attributes: {} };
    const project = new ctx.DysonSwarmReceiverProject(params, 'dyson');
    project.collectorCost = { colony: { glass: 1, electronics: 1, components: 1 } };

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.projects.dyson = project;

    project.isCompleted = false;
    const started = project.startCollector();
    expect(started).toBe(true);
    expect(project.collectorProgress).toBe(project.collectorDuration);
    ctx.projectManager.updateProjects(1000);
    expect(project.collectorProgress).toBe(project.collectorDuration - 1000);
  });

  test('auto deploy starts collectors without receiver completion', () => {
    const ctx = {
      console,
      EffectableEntity,
      resources: {
        colony: {
          glass: { value: 10, decrease: () => {}, updateStorageCap: () => {} },
          electronics: { value: 10, decrease: () => {}, updateStorageCap: () => {} },
          components: { value: 10, decrease: () => {}, updateStorageCap: () => {} }
        }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const baseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'TerraformingDurationProject.js'), 'utf8');
    vm.runInContext(baseCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);

    const params = { name: 'dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true, attributes: {} };
    const project = new ctx.DysonSwarmReceiverProject(params, 'dyson');
    project.collectorCost = { colony: { glass: 1, electronics: 1, components: 1 } };
    project.isCompleted = false;
    project.collectors = 1;
    project.autoDeployCollectors = true;

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.projects.dyson = project;

    project.update(0);
    expect(project.collectorProgress).toBe(project.collectorDuration);

    project.update(project.collectorDuration);
    expect(project.collectors).toBe(2);
    expect(project.collectorProgress).toBe(project.collectorDuration);
  });
});
