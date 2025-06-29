const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('waitForCapacity flag', () => {
  let Project;
  let context;
  beforeEach(() => {
    context = {
      console,
      EffectableEntity,
      shipEfficiency: 1,
      resources: {},
      buildings: {},
      colonies: {},
      projectManager: { projects: {} },
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
    Project = context.Project;

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
        metal: { value: 0 },
        energy: { value: 0 }
      },
      special: { spaceships: { value: 0 } }
    };
    context.resources = global.resources;
  });

  function createExportProject() {
    const config = {
      name: 'Export',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceExport: true,
        costPerShip: { colony: { metal: 10 } },
        disposable: { colony: ['metal'] },
        disposalAmount: 100,
        fundingGainAmount: 1
      }
    };
    const project = new Project(config, 'export');
    project.assignedSpaceships = 1;
    project.selectedDisposalResource = { category: 'colony', resource: 'metal' };
    return project;
  }

  test('requires full disposal amount when enabled', () => {
    const project = createExportProject();
    project.waitForCapacity = true;
    global.resources.colony.metal.value = 100; // cost only (10) plus partial disposal
    global.resources.special.spaceships.value = 1;
    expect(project.canStart()).toBe(false);
    global.resources.colony.metal.value = 110; // cost + disposal
    expect(project.canStart()).toBe(true);
  });

  test('ignores disposal amount when disabled', () => {
    const project = createExportProject();
    project.waitForCapacity = false;
    global.resources.colony.metal.value = 10; // only cost
    global.resources.special.spaceships.value = 1;
    expect(project.canStart()).toBe(true);
  });
});
