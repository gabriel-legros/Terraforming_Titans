const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('project auto-start preservation setting', () => {
  function stubResource(value) {
    return {
      value,
      decrease(amount) { this.value = Math.max(this.value - amount, 0); },
      increase(amount) { this.value += amount; },
    };
  }

  const config = {
    name: 'Test',
    category: 'resources',
    cost: {},
    duration: 1000,
    description: '',
    repeatable: true,
    unlocked: true,
    attributes: {},
  };

  function loadProjectContext(settings) {
    const ctx = { console, EffectableEntity, gameSettings: settings };
    ctx.resources = { colony: { energy: stubResource(1000) } };
    vm.createContext(ctx);
    const projCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projCode + '; this.Project = Project; this.ProjectManager = ProjectManager;', ctx);
    return ctx;
  }

  test('autoStart persists across travel when setting enabled and waits for unlock', () => {
    const ctx = loadProjectContext({ preserveProjectAutoStart: true });
    const project = new ctx.Project(config, 'test');
    project.autoStart = true;
    const pm1 = new ctx.ProjectManager();
    ctx.projectManager = pm1;
    pm1.projects.test = project;
    const saved = pm1.saveTravelState();

    const pm2 = new ctx.ProjectManager();
    ctx.projectManager = pm2;
    const newProject = new ctx.Project({ ...config, unlocked: false }, 'test');
    pm2.projects.test = newProject;
    pm2.loadTravelState(saved);
    expect(newProject.autoStart).toBe(true);
    expect(newProject.isActive).toBe(false);
    newProject.unlocked = true;
    if (newProject.autoStart && !newProject.isActive && newProject.canStart()) {
      newProject.start(ctx.resources);
    }
    expect(newProject.isActive).toBe(true);
  });

  test('autoStart resets across travel when setting disabled', () => {
    const ctx = loadProjectContext({ preserveProjectAutoStart: false });
    const project = new ctx.Project(config, 'test');
    project.autoStart = true;
    const pm1 = new ctx.ProjectManager();
    ctx.projectManager = pm1;
    pm1.projects.test = project;
    const saved = pm1.saveTravelState();

    const pm2 = new ctx.ProjectManager();
    ctx.projectManager = pm2;
    const newProject = new ctx.Project(config, 'test');
    pm2.projects.test = newProject;
    pm2.loadTravelState(saved);
    expect(newProject.autoStart).toBe(false);
  });
});
