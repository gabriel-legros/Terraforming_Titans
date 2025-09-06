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

describe('continuous spaceship project run toggle', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity, shipEfficiency: 1 };
    ctx.resources = {
      colony: {
        energy: stubResource(100000),
        metal: stubResource(0)
      },
      special: { spaceships: { value: 200 } }
    };
    vm.createContext(ctx);
    const projCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projCode + '; this.Project = Project; this.ProjectManager = ProjectManager;', ctx);
    ctx.projectManager = new ctx.ProjectManager();
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);
    global.resources = ctx.resources;
    global.shipEfficiency = ctx.shipEfficiency;
    global.projectManager = ctx.projectManager;
  });

  test('stops resource flow when autoStart disabled', () => {
    const config = {
      name: 'Import Carbon',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { energy: 10 } },
        resourceGainPerShip: { colony: { metal: 20 } }
      }
    };
    const project = new ctx.SpaceMiningProject(config, 'importCarbon');
    project.assignedSpaceships = 150;
    project.autoStart = true;
    project.start(ctx.resources);
    ctx.projectManager.projects.importCarbon = project;

    ctx.projectManager.updateProjects(1000);
    let changes = createChanges(ctx.resources);
    project.applyCostAndGain(1000, changes);
    applyChanges(ctx.resources, changes);
    const metalAfterRun = ctx.resources.colony.metal.value;
    const energyAfterRun = ctx.resources.colony.energy.value;
    expect(metalAfterRun).toBeGreaterThan(0);
    expect(energyAfterRun).toBeLessThan(100000);

    project.autoStart = false;
    const metalBeforeStop = ctx.resources.colony.metal.value;
    const energyBeforeStop = ctx.resources.colony.energy.value;
    ctx.projectManager.updateProjects(1000);
    expect(project.isActive).toBe(false);
    expect(ctx.resources.colony.metal.value).toBe(metalBeforeStop);
    expect(ctx.resources.colony.energy.value).toBe(energyBeforeStop);
  });
});
