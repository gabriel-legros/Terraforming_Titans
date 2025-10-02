const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

let SpaceshipProject;
let SpaceMiningProject;
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
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
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
    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(miningCode + '; this.SpaceMiningProject = SpaceMiningProject;', context);
    SpaceshipProject = context.SpaceshipProject;
    SpaceMiningProject = context.SpaceMiningProject;

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

  test('dynamic water import per cycle matches single ship capacity', () => {
    const config = {
      name: 'Water Import',
      category: 'resources',
      cost: {},
      duration: 100000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        dynamicWaterImport: true,
        costPerShip: {},
        resourceGainPerShip: { surface: { ice: 1000000 } }
      }
    };

    global.resources = {
      colony: {},
      surface: {
        ice: { value: 0, increase: jest.fn(), decrease: jest.fn(), updateStorageCap: () => {} },
        liquidWater: { value: 0, increase: jest.fn(), decrease: jest.fn(), updateStorageCap: () => {} }
      },
      special: { spaceships: { value: 0 } }
    };
    context.resources = global.resources;

    const zonalWater = {
      tropical: { ice: 0, liquid: 0 },
      temperate: { ice: 0, liquid: 0 },
      polar: { ice: 0, liquid: 0 }
    };

    const terraforming = {
      celestialParameters: { gravity: 9.81, radius: 6371 },
      temperature: { zones: { tropical: { value: 280 }, temperate: { value: 250 }, polar: { value: 240 } } },
      zonalWater,
      synchronizeGlobalResources: jest.fn()
    };

    global.terraforming = terraforming;
    context.terraforming = terraforming;

    const getZonePercentage = jest.fn(() => 1 / 3);
    global.getZonePercentage = getZonePercentage;
    context.getZonePercentage = getZonePercentage;

    const project = new SpaceMiningProject(config, 'waterImport');
    project.assignedSpaceships = 50;

    const totalGain = project.calculateSpaceshipTotalResourceGain();
    expect(totalGain.surface.liquidWater).toBeCloseTo(1000000);

    project.start(global.resources);
    expect(project.pendingGain.surface.liquidWater).toBeCloseTo(1000000);

    project.remainingTime = 0;
    project.complete();

    expect(terraforming.zonalWater.tropical.liquid).toBeCloseTo(1000000);
    expect(getZonePercentage).toHaveBeenCalled();

    delete global.getZonePercentage;
    delete context.getZonePercentage;
  });
});
