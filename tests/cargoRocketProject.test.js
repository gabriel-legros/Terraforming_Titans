const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Cargo Rocket project', () => {
  test('parameters use CargoRocketProject type and have resource choices', () => {
    const paramsPath = path.join(__dirname, '..', 'src/js', 'project-parameters.js');
    const code = fs.readFileSync(paramsPath, 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.cargo_rocket;
    expect(project.type).toBe('CargoRocketProject');
    expect(project.repeatable).toBe(true);
    expect(project.attributes.resourceChoiceGainCost).toBeDefined();
  });

  test('CargoRocketProject defines resource choice methods', () => {
    const ctx = { console };
    vm.createContext(ctx);

    const effCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const subclassCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(subclassCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);

    expect(typeof ctx.CargoRocketProject.prototype.getResourceChoiceGainCost).toBe('function');
    expect(typeof ctx.CargoRocketProject.prototype.applyResourceChoiceGain).toBe('function');
  });

  test('changing selection after start does not increase gains', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: { funding: { value: 1e9, decrease: jest.fn(), modifyRate: jest.fn() } },
        special: { spaceships: { value: 0, increase: jest.fn(), modifyRate: jest.fn() } }
      },
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
    };
    vm.createContext(ctx);
    global.resources = ctx.resources;
    global.projectManager = ctx.projectManager;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);

    const config = {
      name: 'Cargo Rocket',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { resourceChoiceGainCost: { special: { spaceships: 5 } } }
    };

    const project = new ctx.CargoRocketProject(config, 'cargo_rocket');
    project.selectedResources = [{ category: 'special', resource: 'spaceships', quantity: 1 }];
    project.start(ctx.resources);
    project.autoStart = true;

    project.selectedResources = [{ category: 'special', resource: 'spaceships', quantity: 1000000 }];
    project.estimateProjectCostAndGain();
    project.complete();

    expect(ctx.resources.special.spaceships.increase).toHaveBeenCalledWith(1);
  });

  test('cannot start without selecting resources', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: { funding: { value: 1e9, decrease: jest.fn(), modifyRate: jest.fn() } },
        special: { spaceships: { value: 0, increase: jest.fn(), modifyRate: jest.fn() } }
      },
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
    };
    vm.createContext(ctx);
    global.resources = ctx.resources;
    global.projectManager = ctx.projectManager;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);

    const config = {
      name: 'Cargo Rocket',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { resourceChoiceGainCost: { special: { spaceships: 5 } } }
    };

    const project = new ctx.CargoRocketProject(config, 'cargo_rocket');
    project.selectedResources = [];
    expect(project.canStart()).toBe(false);
  });

  test('estimateCostAndGain only applies rates when applyRates is true', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: { funding: { value: 1e9, decrease: jest.fn(), modifyRate: jest.fn() } },
        special: { spaceships: { value: 0, increase: jest.fn(), modifyRate: jest.fn() } }
      },
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
    };
    vm.createContext(ctx);
    global.resources = ctx.resources;
    global.projectManager = ctx.projectManager;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);

    const config = {
      name: 'Cargo Rocket',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { resourceChoiceGainCost: { special: { spaceships: 5 } } }
    };

    const project = new ctx.CargoRocketProject(config, 'cargo_rocket');
    project.selectedResources = [{ category: 'special', resource: 'spaceships', quantity: 1 }];
    project.start(ctx.resources);
    project.autoStart = true;

    project.estimateCostAndGain(1000, false);
    project.estimateCostAndGain(1000, true);

    expect(ctx.resources.colony.funding.modifyRate).toHaveBeenCalledTimes(1);
    expect(ctx.resources.special.spaceships.modifyRate).toHaveBeenCalledTimes(1);
  });

  test('trading research converts cargo rocket to continuous mode', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: {
          funding: { value: 100, decrease(amount){ this.value -= amount; }, increase(){}, modifyRate(){}, },
          metal: { value: 0, increase(amount){ this.value += amount; }, modifyRate(){}, }
        },
        special: { spaceships: { value: 0, increase(){}, modifyRate(){}, } }
      },
      projectManager: { projects: {}, getDurationMultiplier: () => 1 },
    };
    vm.createContext(ctx);
    global.resources = ctx.resources;
    global.projectManager = ctx.projectManager;

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const cargoCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'CargoRocketProject.js'), 'utf8');
    vm.runInContext(cargoCode + '; this.CargoRocketProject = CargoRocketProject;', ctx);

    const config = {
      name: 'Cargo Rocket',
      category: 'resources',
      cost: {},
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: { resourceChoiceGainCost: { colony: { metal: 2 } } }
    };

    const project = new ctx.CargoRocketProject(config, 'cargo_rocket');
    project.selectedResources = [{ category: 'colony', resource: 'metal', quantity: 1 }];
    project.start(ctx.resources);
    expect(ctx.resources.colony.funding.value).toBe(98);

    project.addEffect({ type: 'booleanFlag', flagId: 'continuousTrading', value: true });
    project.update(0);
    expect(ctx.resources.colony.metal.value).toBe(1);
    expect(project.pendingResourceGains).toBeNull();
    expect(project.isContinuous()).toBe(true);
    project.autoStart = true;

    project.selectedResources = [{ category: 'colony', resource: 'metal', quantity: 1 }];
    project.applyCostAndGain(1000);
    expect(ctx.resources.colony.funding.value).toBeCloseTo(96);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(2);
  });
});
