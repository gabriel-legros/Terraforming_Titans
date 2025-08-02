const fs = require('fs');
const path = require('path');
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));

describe('Space Storage project', () => {
  test('defined in parameters', () => {
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(paramsCode + '; this.projectParameters = projectParameters;', ctx);
    const project = ctx.projectParameters.spaceStorage;
    expect(project).toBeDefined();
    expect(project.type).toBe('SpaceStorageProject');
    expect(project.category).toBe('mega');
    expect(project.cost.colony.metal).toBe(1_000_000_000_000);
    expect(project.duration).toBe(300000);
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(Infinity);
    expect(project.attributes.costPerShip.colony.energy).toBe(500_000_000);
    expect(project.attributes.transportPerShip).toBe(1_000_000);
  });

  test('scales with terraformed worlds and saves used storage', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {},
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: { getTerraformedPlanetCount: () => 2 }
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const attrs = { costPerShip: { colony: { energy: 1_000_000_000 } }, transportPerShip: 1_000_000_000 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 300000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    expect(project.getBaseDuration()).toBeCloseTo(100000);
    project.assignedSpaceships = 150;
    expect(project.getBaseDuration()).toBeCloseTo(1000);
    expect(project.calculateTransferAmount()).toBe(1_500_000_000);
    project.repeatCount = 2;
    expect(project.maxStorage).toBe(2000000000000);
    project.usedStorage = 1234;
    project.resourceUsage = { metal: 100 };
    project.shipWithdrawMode = true;
    const saved = project.saveState();
    const loaded = new ctx.SpaceStorageProject(params, 'spaceStorage');
    loaded.loadState(saved);
    expect(loaded.usedStorage).toBe(1234);
    expect(loaded.resourceUsage.metal).toBe(100);
    expect(loaded.shipWithdrawMode).toBe(true);
  });

  test('renders assignment UI with resource checkboxes', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: { special: { spaceships: { value: 0 } }, colony: { energy: { displayName: 'Energy', value: 0 } } },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      document: dom.window.document,
      spaceManager: { getTerraformedPlanetCount: () => 0 },
      formatNumber: numbers.formatNumber,
      formatBigInteger: numbers.formatBigInteger,
      formatTotalCostDisplay: () => '',
      formatTotalResourceGainDisplay: () => ''
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const attrs = { costPerShip: { colony: { energy: 1_000_000_000 } }, transportPerShip: 1_000_000_000 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 300000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    const container = dom.window.document.getElementById('root');
    project.updateCostAndGains = () => {};
    project.renderUI(container);
    const checkboxes = container.querySelectorAll('.space-storage-resources input[type="checkbox"]');
    expect(checkboxes.length).toBe(8);
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new dom.window.Event('change'));
    expect(project.selectedResources).toContainEqual({ category: 'colony', resource: 'metal' });
  });

  test('withdraw mode returns stored resources', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: { colony: { metal: { value: 0, increase(v){ this.value += v; }, decrease(v){ this.value -= v; } } } },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: { getTerraformedPlanetCount: () => 0 }
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);
    const attrs = { costPerShip: {}, transportPerShip: 1000 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];
    project.assignedSpaceships = 50;
    project.resourceUsage = { metal: 2000 };
    project.usedStorage = 2000;
    project.shipWithdrawMode = true;
    project.completeShipOperation();
    expect(ctx.resources.colony.metal.value).toBe(1000);
    expect(project.resourceUsage.metal).toBe(1000);
    expect(project.usedStorage).toBe(1000);
  });
});
