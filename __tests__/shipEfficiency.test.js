const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;

let Project;
let context;

describe('shipEfficiency effect', () => {
  let project;
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
    const projectCode = fs.readFileSync(path.join(__dirname, '..', 'projects.js'), 'utf8');
    vm.runInContext(projectCode + '; this.Project = Project;', context);
    Project = context.Project;

    global.buildings = {};
    global.colonies = {};
    global.projectManager = { projects: {} };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.terraforming = {};
    global.lifeDesigner = {};
    global.lifeManager = {};
    global.oreScanner = {};
    global.resources = { colony: { metal: { updateStorageCap: () => {} } }, special:{ spaceships:{ value:0 } } };
    global.globalEffects = context.globalEffects;
    global.shipEfficiency = context.shipEfficiency;

    const config = {
      name: 'Test',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceMining: true,
        costPerShip: { colony: { metal: 1 } },
        resourceGainPerShip: { colony: { metal: 10 } }
      }
    };
    project = new Project(config, 'test');
    project.assignedSpaceships = 1;
  });

  test('multiplies spaceship resource gain', () => {
    let gain = project.calculateSpaceshipTotalResourceGain();
    expect(gain.colony.metal).toBeCloseTo(10);
    global.globalEffects.addAndReplace({ type: 'shipEfficiency', value: 0.2, effectId: 'skill', sourceId: 'skill' });
    context.shipEfficiency = global.shipEfficiency;
    gain = project.calculateSpaceshipTotalResourceGain();
    expect(gain.colony.metal).toBeCloseTo(12);
  });

  test('calculates gain per ship with efficiency', () => {
    let gain = project.calculateSpaceshipGainPerShip();
    expect(gain.colony.metal).toBeCloseTo(10);
    global.globalEffects.addAndReplace({ type: 'shipEfficiency', value: 0.2, effectId: 'skill', sourceId: 'skill' });
    context.shipEfficiency = global.shipEfficiency;
    gain = project.calculateSpaceshipGainPerShip();
    expect(gain.colony.metal).toBeCloseTo(12);
  });

  test('multiplies export amount', () => {
    const exportConfig = {
      name: 'ExportTest',
      category: 'resources',
      cost: {},
      duration: 100,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {
        spaceExport: true,
        costPerShip: { colony: { metal: 1 } },
        disposable: { colony: ['metal'] },
        disposalAmount: 20,
        fundingGainAmount: 1
      }
    };
    const exportProject = new Project(exportConfig, 'exportTest');
    exportProject.assignedSpaceships = 1;
    exportProject.selectedDisposalResource = { category: 'colony', resource: 'metal' };

    let disposal = exportProject.calculateSpaceshipTotalDisposal();
    expect(disposal.colony.metal).toBeCloseTo(20);
    global.globalEffects.addAndReplace({ type: 'shipEfficiency', value: 0.2, effectId: 'skill', sourceId: 'skill' });
    context.shipEfficiency = global.shipEfficiency;
    disposal = exportProject.calculateSpaceshipTotalDisposal();
    expect(disposal.colony.metal).toBeCloseTo(24);
  });
});
