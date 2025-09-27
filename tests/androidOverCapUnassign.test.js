const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('androids over cap', () => {
  test('android assignments limited by storage cap', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager; this.Project = Project;', ctx);
    const androidCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'AndroidProject.js'), 'utf8');
    vm.runInContext(androidCode + '; this.AndroidProject = AndroidProject;', ctx);
    const populationCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'population.js'), 'utf8');
    vm.runInContext(populationCode + '; this.PopulationModule = PopulationModule;', ctx);

    ctx.resources = {
      colony: {
        colonists: { value: 0 },
        workers: { value: 0, cap: 0 },
        androids: { value: 10, cap: 5 }
      }
    };
    ctx.updateProjectUI = () => {};
    ctx.projectManager = new ctx.ProjectManager();
    const config = { name: 'Test', category: 'general', cost: {}, duration: 100, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: {} };
    const configStr = JSON.stringify(config);

    vm.runInContext(`
      const proj = new AndroidProject(${configStr}, 'test');
      proj.assignedAndroids = 7;
      projectManager.projects.test = proj;
      const pop = new PopulationModule(resources, { workerRatio: 0 });
      pop.updateWorkerCap();
      this.cap = resources.colony.workers.cap;
      this.assigned = proj.assignedAndroids;
    `, ctx);

    expect(ctx.cap).toBe(0);
    expect(ctx.assigned).toBe(5);
  });
});
