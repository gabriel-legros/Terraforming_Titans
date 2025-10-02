const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
const physics = require('../src/js/physics.js');

describe('SpaceMiningProject atmospheric monitoring gating', () => {
  let context;
  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      calculateAtmosphericPressure: physics.calculateAtmosphericPressure,
      resources: {},
      buildings: {},
      colonies: {},
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
      populationModule: {},
      tabManager: {},
      fundingModule: {},
      terraforming: { celestialParameters: { gravity: 1, radius: 1 } },
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {},
      globalEffects: new EffectableEntity({ description: 'global' })
    };
    vm.createContext(context);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project; this.ProjectManager = ProjectManager;', context);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', context);
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', context);

    context.resources = {
      colony: { metal: { value: 0 } },
      special: { spaceships: { value: 1 } },
      atmospheric: { carbonDioxide: { value: 0 }, inertGas: { value: 0 }, oxygen: { value: 0 } },
      surface: {},
      underground: {},
    };
    global.resources = context.resources;
    global.projectManager = context.projectManager;
    global.populationModule = context.populationModule;
    global.tabManager = context.tabManager;
    global.fundingModule = context.fundingModule;
    global.terraforming = context.terraforming;
    global.lifeDesigner = context.lifeDesigner;
    global.lifeManager = context.lifeManager;
    global.oreScanner = context.oreScanner;
    global.globalEffects = context.globalEffects;
    global.shipEfficiency = context.shipEfficiency;
    global.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
  });

  afterEach(() => {
    delete global.resources;
    delete global.projectManager;
    delete global.populationModule;
    delete global.tabManager;
    delete global.fundingModule;
    delete global.terraforming;
    delete global.lifeDesigner;
    delete global.lifeManager;
    delete global.oreScanner;
    delete global.globalEffects;
    delete global.shipEfficiency;
    delete global.calculateAtmosphericPressure;
  });

  function createProject(gas) {
    const config = {
      name: 'Mine',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: {},
        resourceGainPerShip: { atmospheric: { [gas]: 1 } }
      }
    };
    const project = new context.SpaceMiningProject(config, 'mine');
    project.assignedSpaceships = 1;
    return project;
  }

  test('carbon mining ignores O2 limit without research', () => {
    const project = createProject('carbonDioxide');
    project.disableAboveOxygenPressure = true;
    project.disableOxygenPressureThreshold = 1e-7;
    context.resources.atmospheric.oxygen.value = 2;
    expect(project.canStart()).toBe(true);
    project.addEffect({ type: 'booleanFlag', flagId: 'atmosphericMonitoring', value: true });
    expect(project.canStart()).toBe(false);
  });

  test('nitrogen mining ignores pressure limit without research', () => {
    const project = createProject('inertGas');
    project.disableAbovePressure = true;
    project.disablePressureThreshold = 1e-7;
    context.resources.atmospheric.inertGas.value = 2;
    expect(project.canStart()).toBe(true);
    project.addEffect({ type: 'booleanFlag', flagId: 'atmosphericMonitoring', value: true });
    expect(project.canStart()).toBe(false);
  });
});
