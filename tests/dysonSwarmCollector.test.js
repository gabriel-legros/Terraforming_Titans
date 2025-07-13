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
          glass: { value: 2000, decrease: () => {}, updateStorageCap: () => {} },
          electronics: { value: 2000, decrease: () => {}, updateStorageCap: () => {} },
          components: { value: 2000, decrease: () => {}, updateStorageCap: () => {} },
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
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    const params = { name: 'dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true, attributes: {} };
    const project = new ctx.DysonSwarmReceiverProject(params, 'dyson');
    project.isCompleted = true;
    ctx.projectManager.projects.dyson = project;

    project.startCollector();
    expect(project.collectorProgress).toBe(project.collectorDuration);
    ctx.projectManager.updateProjects(1000);
    expect(project.collectorProgress).toBe(project.collectorDuration - 1000);
  });

  test('collector cannot start before receiver completion', () => {
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
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);

    const params = { name: 'dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true, attributes: {} };
    const project = new ctx.DysonSwarmReceiverProject(params, 'dyson');

    const started = project.startCollector();
    expect(started).toBe(false);
  });
});
