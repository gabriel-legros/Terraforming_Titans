const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');

function stubResource(value) {
  return {
    value,
    decrease(amount) { this.value = Math.max(this.value - amount, 0); },
    increase(amount) { this.value += amount; },
    modifyRate: jest.fn(),
    updateStorageCap: () => {}
  };
}

describe('SpaceMiningProject pressure limit capping', () => {
  let ctx;
  beforeEach(() => {
    ctx = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      resources: {},
      projectManager: { projects: {}, durationMultiplier: 1 },
      terraforming: { celestialParameters: { gravity: 1, radius: 0.01 } },
      calculateAtmosphericPressure: physics.calculateAtmosphericPressure,
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project; this.ProjectManager = ProjectManager;', ctx);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', ctx);
    global.resources = ctx.resources;
    global.projectManager = ctx.projectManager;
    global.terraforming = ctx.terraforming;
    global.shipEfficiency = ctx.shipEfficiency;
    global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
  });

  function massForPressure(kPa, gravity, radius) {
    const pa = kPa * 1000;
    const area = 4 * Math.PI * Math.pow(radius * 1000, 2);
    return (pa * area) / (1000 * gravity);
  }

  test('imports only up to pressure threshold', () => {
    const threshold = 0.01; // kPa
    const massLimit = massForPressure(threshold, ctx.terraforming.celestialParameters.gravity, ctx.terraforming.celestialParameters.radius);
    ctx.resources = {
      colony: { energy: stubResource(1000) },
      special: { spaceships: { value: 200 } },
      atmospheric: { inertGas: stubResource(massLimit - 1) },
      surface: {},
      underground: {}
    };
    global.resources = ctx.resources;
    const config = {
      name: 'Mine',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { energy: 0 } },
        resourceGainPerShip: { atmospheric: { inertGas: 10 } }
      }
    };
    const project = new ctx.SpaceMiningProject(config, 'mine');
    project.disableAbovePressure = true;
    project.disablePressureThreshold = threshold;
    project.assignSpaceships(200);
    project.start(ctx.resources);
    const duration = project.getEffectiveDuration();
    project.update(duration);
    project.applyCostAndGain(duration);
    expect(ctx.resources.atmospheric.inertGas.value).toBeCloseTo(massLimit);
  });
});
