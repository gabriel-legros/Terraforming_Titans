const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('space mining non-continuous production timing', () => {
  let context;
  let project;
  let iceResource;

  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
      projectElements: {},
      formatNumber: (value) => value,
      formatBigInteger: (value) => value.toString(),
      formatTotalCostDisplay: () => '',
      formatTotalResourceGainDisplay: () => '',
      formatTotalDisposalDisplay: () => '',
      resources: {},
      buildings: {},
      colonies: {},
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

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(`${projectsCode}; this.Project = Project;`, context);

    const spaceshipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(`${spaceshipCode}; this.SpaceshipProject = SpaceshipProject;`, context);

    const miningCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceMiningProject.js'), 'utf8');
    vm.runInContext(`${miningCode}; this.SpaceMiningProject = SpaceMiningProject;`, context);

    global.projectElements = context.projectElements;
    global.projectManager = context.projectManager;
    global.shipEfficiency = context.shipEfficiency;
    global.buildings = {};
    global.colonies = {};
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.terraforming = {};
    global.lifeDesigner = {};
    global.lifeManager = {};
    global.oreScanner = {};
    global.globalEffects = context.globalEffects;

    iceResource = {
      value: 0,
      increase: jest.fn(amount => {
        iceResource.value += amount;
      }),
      decrease: jest.fn(),
      modifyRate: jest.fn(),
      updateStorageCap: () => {}
    };

    const resources = {
      colony: {},
      surface: { ice: iceResource },
      special: { spaceships: { value: 10 } }
    };

    context.resources = resources;
    global.resources = resources;

    const config = {
      name: 'Asteroid Water Mining',
      category: 'resources',
      cost: {},
      duration: 10000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: {},
        resourceGainPerShip: { surface: { ice: 10 } }
      }
    };

    project = new context.SpaceMiningProject(config, 'asteroid_water_mining');
    project.assignSpaceships(10);
    project.autoStart = true;
  });

  afterEach(() => {
    delete global.projectElements;
    delete global.projectManager;
    delete global.shipEfficiency;
    delete global.buildings;
    delete global.colonies;
    delete global.populationModule;
    delete global.tabManager;
    delete global.fundingModule;
    delete global.terraforming;
    delete global.lifeDesigner;
    delete global.lifeManager;
    delete global.oreScanner;
    delete global.globalEffects;
    delete global.resources;
  });

  test('ships below continuous threshold only deliver when the project completes', () => {
    expect(project.isContinuous()).toBe(false);
    expect(project.assignedSpaceships).toBe(10);
    expect(project.canStart()).toBe(true);

    project.start(global.resources);

    expect(project.pendingGain.surface.ice).toBeCloseTo(10);

    const accumulatedChanges = { colony: {}, surface: { ice: 0 }, special: {} };

    project.estimateCostAndGain(1000, true, 1);

    expect(iceResource.modifyRate).toHaveBeenCalledWith(10, 'Spaceship Mining', 'project');
    expect(iceResource.increase).not.toHaveBeenCalled();
    expect(iceResource.value).toBe(0);

    project.applyCostAndGain(1000, accumulatedChanges, 1);

    expect(accumulatedChanges.surface.ice).toBe(0);
    expect(iceResource.increase).not.toHaveBeenCalled();
    expect(iceResource.value).toBe(0);

    const duration = project.getEffectiveDuration();
    project.update(duration);

    expect(iceResource.increase).toHaveBeenCalledWith(10);
    expect(iceResource.value).toBeCloseTo(10);
    expect(project.pendingGain).toBeNull();
  });
});
