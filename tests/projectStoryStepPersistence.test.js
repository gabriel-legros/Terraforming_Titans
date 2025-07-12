const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('story step persistence across save/load', () => {
  test('shown steps are kept after reload', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');

    const ctx = {
      console,
      EffectableEntity,
      addJournalEntry: jest.fn(),
      addEffect: () => {},
      removeEffect: () => {},
      resources: {},
      buildings: {},
      colonies: {},
      document: { getElementById: () => null }
    };
    vm.createContext(ctx);
    vm.runInContext(projectCode + paramsCode + progressCode + '; this.Project = Project; this.ProjectManager = ProjectManager; this.projectParameters = projectParameters;', ctx);

    const manager = new ctx.ProjectManager();
    manager.initializeProjects(ctx.projectParameters);
    const proj = manager.projects.interrogate_alien;

    // complete first step
    proj.isActive = true;
    proj.remainingTime = 0;
    proj.complete();
    expect(proj.shownStorySteps.has(0)).toBe(true);

    const saved = manager.saveState();

    // load into new manager
    const manager2 = new ctx.ProjectManager();
    manager2.initializeProjects(ctx.projectParameters);
    manager2.loadState(saved);
    const loaded = manager2.projects.interrogate_alien;
    expect(loaded.shownStorySteps.has(0)).toBe(true);

    loaded.isActive = true;
    loaded.remainingTime = 0;
    loaded.complete();
    expect(ctx.addJournalEntry).toHaveBeenCalledTimes(2);
  });
});
