const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Space Storage ship efficiency effect', () => {
  let context;
  let project;

  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      resources: { special: { spaceships: { value: 0 } }, colony: { metal: { value: 0 } } },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: {
        getTerraformedPlanetCountIncludingCurrent: () => 1,
        getTerraformedPlanetCount: () => 0
      },
      projectManager: { durationMultiplier: 1 },
      globalEffects: new EffectableEntity({ description: 'global' })
    };
    vm.createContext(context);
    vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', context);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', context);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', context);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', context);

    global.shipEfficiency = context.shipEfficiency;
    global.globalEffects = context.globalEffects;
    global.resources = context.resources;
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

    const attrs = { transportPerShip: 1000 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    project = new context.SpaceStorageProject(params, 'spaceStorage');
  });

  test('ship efficiency increases transfer capacity', () => {
    expect(project.calculateTransferAmount()).toBeCloseTo(1000);
    context.globalEffects.addAndReplace({ type: 'shipEfficiency', value: 0.5, effectId: 'skill', sourceId: 'skill' });
    context.shipEfficiency = global.shipEfficiency;
    expect(project.calculateTransferAmount()).toBeCloseTo(1500);
    project.assignedSpaceships = 200;
    expect(project.calculateTransferAmount()).toBeCloseTo(300000);
  });
});

