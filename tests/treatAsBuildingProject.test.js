const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('treatAsBuilding flag', () => {
  test('projects with flag run during building phase only', () => {
    const ctx = {
      console,
      EffectableEntity,
      resources: {
        colony: {
          energy: {
            value: 0,
            productionRate: 0,
            consumptionRate: 0,
            productionRateByType: {},
            consumptionRateByType: {},
            modifyRate: jest.fn(),
            updateStorageCap: () => {},
            resetRates() {
              this.productionRate = 0;
              this.consumptionRate = 0;
              this.productionRateByType = {};
              this.consumptionRateByType = {};
            },
            recalculateTotalRates() {},
            hasCap: false,
            cap: Infinity,
            increase(amount) { this.value += amount; }
          }
        }
      },
      dayNightCycle: { isDay: () => true },
      buildings: {},
      colonies: {},
      projectManager: { projects: {}, projectOrder: [] },
      terraforming: { updateResources: () => {}, distributeGlobalChangesToZones: () => {} },
      structures: {},
      globalEffects: {},
      fundingModule: null,
      lifeManager: null,
      researchManager: null,
    };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const baseCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'TerraformingDurationProject.js'), 'utf8');
    vm.runInContext(baseCode + '; this.TerraformingDurationProject = TerraformingDurationProject;', ctx);
    const dysonCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'dysonswarm.js'), 'utf8');
    vm.runInContext(dysonCode + '; this.DysonSwarmReceiverProject = DysonSwarmReceiverProject;', ctx);
    const resourceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resource.js'), 'utf8');
    vm.runInContext(resourceCode + '; this.produceResources = produceResources;', ctx);

    const params = { name: 'Dyson', category: 'mega', cost: {}, duration: 0, description: '', repeatable: false, unlocked: true };
    const dyson = new ctx.DysonSwarmReceiverProject(params, 'dyson');
    dyson.isCompleted = true;
    dyson.collectors = 1;
    dyson.energyPerCollector = 10;
    dyson.treatAsBuilding = true;

    const normal = {
      estimateCostAndGain: jest.fn(() => ({ cost: {}, gain: {} })),
      applyCostAndGain: jest.fn(),
      isContinuous: () => true,
    };

    ctx.projectManager.projects = { dyson, normal };
    ctx.projectManager.projectOrder = ['dyson', 'normal'];

    jest.spyOn(dyson, 'estimateCostAndGain');
    jest.spyOn(dyson, 'applyCostAndGain');

    ctx.produceResources(1000, {});

    expect(dyson.estimateCostAndGain).toHaveBeenCalledTimes(2);
    expect(dyson.applyCostAndGain).toHaveBeenCalledTimes(1);
    expect(normal.applyCostAndGain).toHaveBeenCalledTimes(1);
  });
});
