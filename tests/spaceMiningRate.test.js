const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

let SpaceshipProject;
let context;

describe('space mining rate scaling', () => {
  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      resources: {},
      buildings: {},
      colonies: {},
      projectManager: { projects: {}, durationMultiplier: 1 },
      populationModule: {},
      tabManager: {},
      fundingModule: {},
      terraforming: {},
      lifeDesigner: {},
      lifeManager: {},
      oreScanner: {},
      globalEffects: new EffectableEntity({ description: 'global' })
    };
    vm.createContext(context);
    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectCode + '; this.Project = Project;', context);
    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(spaceshipCode + '; this.SpaceshipProject = SpaceshipProject;', context);
    SpaceshipProject = context.SpaceshipProject;

    global.buildings = {};
    global.colonies = {};
    global.projectManager = context.projectManager;
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.terraforming = {};
    global.lifeDesigner = {};
    global.lifeManager = {};
    global.oreScanner = {};
    global.globalEffects = context.globalEffects;
    global.shipEfficiency = context.shipEfficiency;

    global.resources = {
      colony: {
        metal: { value: 0, modifyRate: jest.fn(), updateStorageCap: () => {} }
      },
      special: { spaceships: { value: 0 } }
    };
    context.resources = global.resources;
  });

  test('gains scale with short duration', () => {
    const config = {
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: {},
        resourceGainPerShip: { colony: { metal: 10 } }
      }
    };
    const project = new SpaceshipProject(config, 'test');
    project.assignedSpaceships = 1;
    project.getEffectiveDuration = () => 500;
    project.start(context.resources);
    project.autoStart = true;

    project.estimateCostAndGain();

    expect(global.resources.colony.metal.modifyRate).toHaveBeenCalledWith(
      20,
      'Spaceship Mining',
      'project'
    );
  });
});
