const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function loadModuleIntoContext(ctx, relativePath, exportName) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  vm.runInContext(code, ctx);
  if (exportName) {
    vm.runInContext(`this.${exportName} = ${exportName};`, ctx);
  }
}

function createProjectContext() {
  const ctx = {
    console,
    EffectableEntity,
    globalGameIsLoadingFromSave: false,
    formatNumber: n => n,
    formatBigInteger: n => n,
    formatTotalCostDisplay: () => '',
    formatTotalResourceGainDisplay: () => '',
    formatTotalMaintenanceDisplay: () => '',
    calculateProjectProductivities: () => ({}),
    projectElements: {},
    resources: {
      colony: {},
      special: {},
      surface: {},
      atmospheric: {},
    },
    buildings: {},
    colonies: {},
  };

  vm.createContext(ctx);

  loadModuleIntoContext(ctx, 'src/js/projects.js');
  vm.runInContext('this.Project = Project; this.ProjectManager = ProjectManager;', ctx);

  return ctx;
}

function createProject(ctx, overrides = {}) {
  const config = {
    name: 'Test Project',
    category: 'general',
    cost: {},
    duration: 1000,
    description: '',
    repeatable: false,
    maxRepeatCount: 1,
    unlocked: true,
    attributes: {},
    ...overrides,
  };
  return new ctx.Project(config, overrides.key || 'testProject');
}

describe('permanent project disable effect', () => {
  test('effect marks project as disabled and prevents interaction', () => {
    const ctx = createProjectContext();
    const project = createProject(ctx, { key: 'alpha' });

    expect(project.isPermanentlyDisabled()).toBe(false);
    expect(project.isVisible()).toBe(true);
    expect(project.canStart()).toBe(true);

    project.addEffect({
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'disable-alpha',
      sourceId: 'testEffect',
    });

    expect(project.isPermanentlyDisabled()).toBe(true);
    expect(project.isVisible()).toBe(false);
    expect(project.canStart()).toBe(false);
  });

  test('removing the effect re-enables the project', () => {
    const ctx = createProjectContext();
    const project = createProject(ctx, { key: 'beta' });

    project.addEffect({
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'disable-beta',
      sourceId: 'testEffect',
    });

    project.removeEffect({ sourceId: 'testEffect' });

    expect(project.isPermanentlyDisabled()).toBe(false);
    expect(project.isVisible()).toBe(true);
    expect(project.canStart()).toBe(true);
  });

  test('disabled projects are skipped during manager updates', () => {
    const ctx = createProjectContext();
    const manager = new ctx.ProjectManager();
    ctx.projectManager = manager;

    const project = createProject(ctx, { key: 'gamma' });
    manager.projects.gamma = project;
    manager.projectOrder = ['gamma'];

    project.addEffect({
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'disable-gamma',
      sourceId: 'testEffect',
    });

    project.update = jest.fn();

    manager.updateProjects(1000);

    expect(project.update).not.toHaveBeenCalled();
  });

  test('projects overriding visibility still hide when permanently disabled', () => {
    const ctx = createProjectContext();
    loadModuleIntoContext(ctx, 'src/js/projects/TerraformingDurationProject.js', 'TerraformingDurationProject');
    loadModuleIntoContext(ctx, 'src/js/projects/dysonswarm.js', 'DysonSwarmReceiverProject');

    const config = {
      name: 'Dyson Swarm Receiver',
      category: 'space',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: false,
      maxRepeatCount: 1,
      unlocked: false,
      attributes: {},
    };

    const project = new ctx.DysonSwarmReceiverProject(config, 'dysonSwarmReceiver');
    project.collectors = 5;

    expect(project.isVisible()).toBe(true);

    project.addEffect({
      type: 'permanentProjectDisable',
      value: true,
      effectId: 'disable-dyson',
      sourceId: 'testEffect',
    });

    expect(project.isVisible()).toBe(false);
  });
});
