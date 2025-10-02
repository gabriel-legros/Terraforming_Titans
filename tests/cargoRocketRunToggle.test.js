const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function stubResource(value) {
  return {
    value,
    decrease(amount) { this.value = Math.max(this.value - amount, 0); },
    increase(amount) { this.value += amount; },
    modifyRate: jest.fn(),
    updateStorageCap: () => {}
  };
}

function createChanges(resources) {
  const changes = {};
  for (const category in resources) {
    changes[category] = {};
    for (const resource in resources[category]) {
      changes[category][resource] = 0;
    }
  }
  return changes;
}

function applyChanges(resources, changes) {
  for (const category in changes) {
    for (const resource in changes[category]) {
      if (resources[category]?.[resource]) {
        resources[category][resource].value += changes[category][resource];
      }
    }
  }
}

describe('cargo rocket continuous run toggle', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity };
    ctx.resources = {
      colony: {
        funding: stubResource(100),
        metal: stubResource(0)
      }
    };
    vm.createContext(ctx);
    const projCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projCode + '; this.Project = Project; this.ProjectManager = ProjectManager;', ctx);
    ctx.projectManager = new ctx.ProjectManager();
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);
    global.resources = ctx.resources;
    global.projectManager = ctx.projectManager;
  });

  test('stops resource flow when run disabled', () => {
    const config = {
      name: 'Cargo Rocket',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: { resourceChoiceGainCost: { colony: { metal: 2 } } }
    };
    const project = new ctx.CargoRocketProject(config, 'cargo_rocket');
    project.selectedResources = [{ category: 'colony', resource: 'metal', quantity: 1 }];
    project.start(ctx.resources);
    project.addEffect({ type: 'booleanFlag', flagId: 'continuousTrading', value: true });
    project.update(0);
    project.autoStart = true;
    ctx.projectManager.projects.cargo_rocket = project;

    let changes = createChanges(ctx.resources);
    project.applyCostAndGain(1000, changes);
    applyChanges(ctx.resources, changes);
    const metalAfterRun = ctx.resources.colony.metal.value;
    const fundingAfterRun = ctx.resources.colony.funding.value;
    expect(metalAfterRun).toBeGreaterThan(0);
    expect(fundingAfterRun).toBeLessThan(100);

    project.autoStart = false;
    ctx.projectManager.updateProjects(1000);
    expect(project.isActive).toBe(false);
    changes = createChanges(ctx.resources);
    project.applyCostAndGain(1000, changes);
    applyChanges(ctx.resources, changes);
    expect(ctx.resources.colony.metal.value).toBe(metalAfterRun);
    expect(ctx.resources.colony.funding.value).toBe(fundingAfterRun);
  });
});
