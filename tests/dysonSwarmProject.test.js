const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Dyson Swarm Receiver project', () => {
  test('defined in parameters', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.dysonSwarmReceiver;
    expect(project).toBeDefined();
    expect(project.type).toBe('DysonSwarmReceiverProject');
    expect(project.category).toBe('mega');
    expect(project.cost.colony.metal).toBe(10000000);
    expect(project.duration).toBe(300000);
    expect(project.treatAsBuilding).toBe(true);
    expect(project.attributes.completedWhenUnlocked).toBe(true);
  });

  test('auto completes when enabled', () => {
    const ctx = {
      console,
      EffectableEntity,
      resources: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: { getCurrentPlanetKey: () => 'mars' },
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const baseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'TerraformingDurationProject.js'), 'utf8');
    vm.runInContext(baseCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.initializeProjects(ctx.projectParameters);

    const before = vm.runInContext('projectManager.projects.dysonSwarmReceiver.isCompleted', ctx);
    expect(before).toBe(false);

    vm.runInContext('projectManager.projects.dysonSwarmReceiver.enable();', ctx);
    const after = vm.runInContext('projectManager.projects.dysonSwarmReceiver.isCompleted', ctx);
    expect(after).toBe(true);
  });
});
