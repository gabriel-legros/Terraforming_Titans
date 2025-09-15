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
    expect(project.cost.colony.metal).toBe(100_000_000_000);
    expect(project.duration).toBe(300000);
    expect(project.repeatable).toBe(true);
    expect(project.maxRepeatCount).toBe(Infinity);
    expect(project.attributes.costPerShip.colony.energy).toBe(250_000_000);
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
      spaceManager: {
        getTerraformedPlanetCount: () => 2,
        getTerraformedPlanetCountIncludingCurrent: () => 3
      },
      projectManager: { getDurationMultiplier: () => 0.5 }
    };
    vm.createContext(ctx);
    vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const attrs = { costPerShip: { colony: { energy: 1_000_000_000 } }, transportPerShip: 1_000_000_000 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 300000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.repeatCount = 1;
    expect(project.getBaseDuration()).toBeCloseTo(100000);
    expect(project.getEffectiveDuration()).toBeCloseTo(50000);
    expect(project.getShipOperationDuration()).toBeCloseTo(50000);
    project.assignedSpaceships = 10;
    expect(project.getShipOperationDuration()).toBeCloseTo(5000);
    project.assignedSpaceships = 150;
    expect(project.getBaseDuration()).toBeCloseTo(100000);
    expect(project.getShipOperationDuration()).toBeCloseTo(50000);
    expect(project.calculateTransferAmount()).toBe(150_000_000_000);
    project.repeatCount = 2;
    expect(project.maxStorage).toBe(200_000_000_000);
    project.usedStorage = 1234;
    project.resourceUsage = { metal: 100 };
    project.shipWithdrawMode = true;
    project.waterWithdrawTarget = 'surface';
    project.strategicReserve = 12;
    const saved = project.saveState();
    const loaded = new ctx.SpaceStorageProject(params, 'spaceStorage');
    loaded.loadState(saved);
    expect(loaded.usedStorage).toBe(1234);
    expect(loaded.resourceUsage.metal).toBe(100);
    expect(loaded.shipWithdrawMode).toBe(true);
    expect(loaded.waterWithdrawTarget).toBe('surface');
    expect(loaded.strategicReserve).toBe(12);
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
        spaceManager: {
          getTerraformedPlanetCount: () => 0,
          getTerraformedPlanetCountIncludingCurrent: () => 1
        },
        formatNumber: numbers.formatNumber,
      formatBigInteger: numbers.formatBigInteger,
      formatTotalCostDisplay: () => '',
      formatTotalResourceGainDisplay: () => '',
      capitalizeFirstLetter: s => s.charAt(0).toUpperCase() + s.slice(1)
    };
      vm.createContext(ctx);
      vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', ctx);
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
    ctx.researchManager = { isBooleanFlagSet: () => false };
    project.updateCostAndGains = () => {};
    project.renderUI(container);
    const checkboxes = container.querySelectorAll('#ss-resource-grid input[type="checkbox"]');
    expect(checkboxes.length).toBe(10);
    const superCheckbox = container.querySelector('#spaceStorage-res-superalloys');
    expect(superCheckbox.parentElement.style.display).toBe('none');
    const visibleCheckboxes = Array.from(checkboxes).filter(cb => cb.parentElement.style.display !== 'none');
    expect(visibleCheckboxes.length).toBe(9);
    const items = container.querySelectorAll('#ss-resource-grid .storage-resource-item');
    expect(items[0].children.length).toBe(3);
    const label = items[0].children[1];
    const fullIcon = label.querySelector('.storage-full-icon');
    expect(fullIcon).toBeDefined();
    expect(fullIcon.style.fontSize).toBe('14px');
    visibleCheckboxes[0].checked = true;
    visibleCheckboxes[0].dispatchEvent(new dom.window.Event('change'));
    expect(project.selectedResources).toContainEqual({ category: 'colony', resource: 'metal' });
  });

  test('expansion duration unaffected by ship assignment and transfers scale with ships', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: { special: { spaceships: { value: 0 } }, colony: { energy: { value: 0 } } },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: {
        getTerraformedPlanetCountIncludingCurrent: () => 1,
        getTerraformedPlanetCount: () => 0
      },
      projectManager: { getDurationMultiplier: () => 1 },
    };
    vm.createContext(ctx);
    vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const attrs = { costPerShip: { colony: { energy: 1 } }, transportPerShip: 1 };
    const params = { name: 'spaceStorage', displayName: 'Space Storage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');

    const baseDuration = project.getEffectiveDuration();
    project.assignedSpaceships = 10;
    const afterAssignDuration = project.getEffectiveDuration();
    expect(afterAssignDuration).toBeCloseTo(baseDuration);

    const shipDuration = project.getShipOperationDuration();
    expect(shipDuration).toBeCloseTo(100000 / 10);
  });

  test('hides default project cost display', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="projects-subtab-content-wrapper"><div id="mega-projects-list"></div></div>');
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: {
          metal: { displayName: 'Metal', value: 0 },
          components: { displayName: 'Components', value: 0 },
          electronics: { displayName: 'Electronics', value: 0 },
          superconductors: { displayName: 'Superconductors', value: 0 },
          water: { displayName: 'Water', value: 0 }
        },
        atmospheric: {
          oxygen: { displayName: 'Oxygen', value: 0 },
          carbonDioxide: { displayName: 'Carbon Dioxide', value: 0 },
          inertGas: { displayName: 'Nitrogen', value: 0 }
        },
        surface: { liquidWater: { displayName: 'Liquid Water', value: 0 } },
        special: { spaceships: { value: 0 } }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
        document: dom.window.document,
        spaceManager: {
          getTerraformedPlanetCount: () => 0,
          getTerraformedPlanetCountIncludingCurrent: () => 1
        },
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
    const projectsUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(projectsUICode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.projectElements = projectElements;', ctx);

    const attrs = { costPerShip: { colony: { metal: 1 } }, transportPerShip: 1 };
    const params = { name: 'spaceStorage', displayName: 'Space Storage', category: 'mega', cost: { colony: { metal: 1 } }, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    ctx.projectManager = { projects: { spaceStorage: project }, isBooleanFlagSet: () => false, getProjectStatuses: () => [project] };

    ctx.createProjectItem(project);
    expect(ctx.projectElements[project.name].costElement).toBeUndefined();
    const costEl = dom.window.document.querySelector('.project-card .project-cost');
    expect(costEl).toBeNull();
  });

  test('displays populated cost section without duplication', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        special: { spaceships: { value: 0 } },
        colony: { energy: { displayName: 'Energy', value: 0 } }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
        document: dom.window.document,
        spaceManager: {
          getTerraformedPlanetCount: () => 0,
          getTerraformedPlanetCountIncludingCurrent: () => 1
        },
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

    const attrs = { costPerShip: { colony: { energy: 1_000_000 } }, transportPerShip: 1_000_000 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 300000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    const container = dom.window.document.getElementById('root');
    project.renderUI(container);

    const costEls = container.querySelectorAll(`#${project.name}-cost-per-ship`);
    expect(costEls.length).toBe(1);
    expect(costEls[0].textContent).toContain('Cost per Ship');
    expect(costEls[0].textContent).toContain('Energy');
  });

  test('can start expansion when metal cost is met without spaceships', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: {
          metal: { value: 1000, decrease(v){ this.value -= v; } }
        },
        special: { spaceships: { value: 0 } }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const params = { name: 'spaceStorage', category: 'mega', cost: { colony: { metal: 1000 } }, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: {} };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    expect(project.canStart()).toBe(true);
    expect(project.start(ctx.resources)).toBe(true);
    expect(ctx.resources.colony.metal.value).toBe(0);
    expect(project.isActive).toBe(true);
  });

  test('cannot start expansion without required metal', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: {
          metal: { value: 500, decrease(v){ this.value -= v; } }
        },
        special: { spaceships: { value: 0 } }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const params = { name: 'spaceStorage', category: 'mega', cost: { colony: { metal: 1000 } }, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: {} };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    expect(project.canStart()).toBe(false);
  });

  test('withdraw mode distributes capacity and returns resources (water to colony)', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: {
          metal: { value: 0, cap: Infinity, increase(v){ this.value += v; }, decrease(v){ this.value -= v; }, modifyRate: () => {} },
          water: { value: 0, cap: Infinity, increase(v){ this.value += v; }, decrease(v){ this.value -= v; }, modifyRate: () => {} }
        }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
        addEffect: () => {},
        globalGameIsLoadingFromSave: false,
        spaceManager: {
          getTerraformedPlanetCount: () => 0,
          getTerraformedPlanetCountIncludingCurrent: () => 1
        }
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
    project.selectedResources = [{ category: 'colony', resource: 'metal' }, { category: 'surface', resource: 'liquidWater' }];
    project.assignedSpaceships = 1;
    project.resourceUsage = { metal: 2000, liquidWater: 1000 };
    project.usedStorage = 3000;
    project.shipWithdrawMode = true;
    project.startShipOperation();
    expect(project.resourceUsage.metal).toBe(1500);
    expect(project.resourceUsage.liquidWater).toBe(500);
    expect(project.usedStorage).toBe(2000);
    project.completeShipOperation();
    expect(ctx.resources.colony.metal.value).toBe(500);
    expect(ctx.resources.colony.water.value).toBe(500);
  });

  test('withdraw mode sends water to surface when target set to surface', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: {
          metal: { value: 0, cap: Infinity, increase(v){ this.value += v; }, decrease(v){ this.value -= v; }, modifyRate: () => {} },
          water: { value: 0, cap: Infinity, increase(v){ this.value += v; }, decrease(v){ this.value -= v; }, modifyRate: () => {} }
        },
        surface: {
          liquidWater: { value: 0, cap: Infinity, increase(v){ this.value += v; }, decrease(v){ this.value -= v; }, modifyRate: () => {} }
        }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
        addEffect: () => {},
        globalGameIsLoadingFromSave: false,
        spaceManager: {
          getTerraformedPlanetCount: () => 0,
          getTerraformedPlanetCountIncludingCurrent: () => 1
        }
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
    project.selectedResources = [{ category: 'surface', resource: 'liquidWater' }];
    project.assignedSpaceships = 1;
    project.resourceUsage = { liquidWater: 1000 };
    project.usedStorage = 1000;
    project.shipWithdrawMode = true;
    project.waterWithdrawTarget = 'surface';
    project.startShipOperation();
    expect(project.resourceUsage.liquidWater).toBeUndefined();
    expect(project.usedStorage).toBe(0);
    project.completeShipOperation();
    expect(ctx.resources.surface.liquidWater.value).toBe(1000);
  });

  test('store mode removes colony resources and stores them', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        colony: {
          metal: { value: 1000, cap: Infinity, decrease(v){ this.value -= v; }, increase(v){ this.value += v; }, modifyRate: () => {} }
        },
        surface: {
          liquidWater: { value: 1000, cap: Infinity, decrease(v){ this.value -= v; }, increase(v){ this.value += v; }, modifyRate: () => {} }
        }
      },
      buildings: {},
      colonies: {},
      projectElements: {},
        addEffect: () => {},
        globalGameIsLoadingFromSave: false,
        spaceManager: {
          getTerraformedPlanetCount: () => 0,
          getTerraformedPlanetCountIncludingCurrent: () => 1
        }
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
    project.repeatCount = 1;
    project.selectedResources = [{ category: 'colony', resource: 'metal' }, { category: 'surface', resource: 'liquidWater' }];
    project.assignedSpaceships = 1;
    project.shipWithdrawMode = false;
    project.startShipOperation();
    expect(ctx.resources.colony.metal.value).toBe(500);
    expect(ctx.resources.surface.liquidWater.value).toBe(500);
    expect(project.usedStorage).toBe(0);
    project.completeShipOperation();
    expect(project.resourceUsage.metal).toBe(500);
    expect(project.resourceUsage.liquidWater).toBe(500);
    expect(project.usedStorage).toBe(1000);
  });

  test('progress button uses storage expansion text', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="projects-subtab-content-wrapper"></div>');
    const ctx = {
      console,
      document: dom.window.document,
      projectElements: {},
      projectManager: { isBooleanFlagSet: function() { return false; } },
      formatNumber: numbers.formatNumber,
      formatBigInteger: numbers.formatBigInteger,
      formatTotalCostDisplay: () => '',
      formatTotalResourceGainDisplay: () => '',
      resources: {},
      buildings: {},
      colonies: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      capitalizeFirstLetter: s => s.charAt(0).toUpperCase() + s.slice(1),
      SpaceMiningProject: function () {},
      SpaceExportBaseProject: function () {},
      SpaceExportProject: function () {},
      SpaceDisposalProject: function () {}
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.projectElements = projectElements;', ctx);

    const attrs = { costPerShip: {}, transportPerShip: 0 };
    const params = { name: 'spaceStorage', displayName: 'Space Storage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.renderUI = () => {};
    project.updateUI = () => {};
    project.getEffectiveDuration = () => 1000;
    project.canStart = () => true;

    ctx.projectManager.projects = { spaceStorage: project };
    ctx.projectManager.isBooleanFlagSet = () => false;
    ctx.projectManager.getProjectStatuses = () => [project];

    ctx.createProjectItem(project);
    ctx.updateProjectUI('spaceStorage');
    const btn = ctx.projectElements[project.name].progressButton;
    expect(btn.textContent).toBe('Start storage expansion (Duration: 1.00 seconds)');
  });

  test('saveTravelState and loadTravelState preserve storage data', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {},
      buildings: {},
      colonies: {},
      projectElements: {},
        addEffect: () => {},
        globalGameIsLoadingFromSave: false,
        spaceManager: {
          getTerraformedPlanetCount: () => 0,
          getTerraformedPlanetCountIncludingCurrent: () => 1
        }
      };
    vm.createContext(ctx);
    vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const attrs = { costPerShip: {}, transportPerShip: 0 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.repeatCount = 4;
    project.usedStorage = 500;
    project.resourceUsage = { metal: 300 };
    project.prioritizeMegaProjects = true;

    const saved = project.saveTravelState();
    const loaded = new ctx.SpaceStorageProject(params, 'spaceStorage');
    loaded.loadTravelState(saved);

    expect(loaded.repeatCount).toBe(4);
    expect(loaded.usedStorage).toBe(500);
    expect(loaded.resourceUsage.metal).toBe(300);
    expect(loaded.prioritizeMegaProjects).toBe(true);
  });

  test('transfers resources continuously based on mode', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        special: { spaceships: { value: 200 } },
        colony: {
          metal: {
            value: 1000,
            cap: Infinity,
            decrease(v){ this.value -= v; },
            increase(v){ this.value += v; },
            modifyRate(value, source, type){
              this.consumptionRateByType = this.consumptionRateByType || {};
              this.productionRateByType = this.productionRateByType || {};
              if (value < 0) {
                this.consumptionRateByType[type] = this.consumptionRateByType[type] || {};
                this.consumptionRateByType[type][source] = (this.consumptionRateByType[type][source] || 0) - value;
              } else if (value > 0) {
                this.productionRateByType[type] = this.productionRateByType[type] || {};
                this.productionRateByType[type][source] = (this.productionRateByType[type][source] || 0) + value;
              }
            }
          },
          energy: { value: 10000, cap: Infinity, decrease(v){ this.value -= v; }, increase(v){ this.value += v; }, modifyRate(){ } }
        },
        surface: {},
        atmospheric: {}
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: { getTerraformedPlanetCount: () => 0, getTerraformedPlanetCountIncludingCurrent: () => 1 }
    };
    vm.createContext(ctx);
    vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const attrs = { costPerShip: { colony: { energy: 10 } }, transportPerShip: 100 };
    const params = { name: 'spaceStorage', displayName: 'Space Storage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.repeatCount = 1;
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];
    project.assignSpaceships(200);
    project.shipOperationAutoStart = true;

    project.update(1000);
    expect(project.resourceUsage.metal).toBeCloseTo(200);
    expect(project.usedStorage).toBeCloseTo(200);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(800);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(9980);
    expect(ctx.resources.colony.metal.consumptionRateByType.project['Space storage transfer'])
      .toBeCloseTo(200);

    project.shipWithdrawMode = true;
    project.update(1000);
    expect(project.resourceUsage.metal).toBeUndefined();
    expect(project.usedStorage).toBeCloseTo(0);
    expect(ctx.resources.colony.metal.value).toBeCloseTo(1000);
    expect(ctx.resources.colony.energy.value).toBeCloseTo(9960);
    expect(ctx.resources.colony.metal.productionRateByType.project['Space storage transfer'])
      .toBeCloseTo(200);
  });

  test('transfer rate matches at 100-ship transition', () => {
    const ctx = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {},
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      spaceManager: { getTerraformedPlanetCount: () => 0, getTerraformedPlanetCountIncludingCurrent: () => 1 }
    };
    vm.createContext(ctx);
    vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);

    const attrs = { costPerShip: {}, transportPerShip: 1000 };
    const params = { name: 'spaceStorage', displayName: 'Space Storage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.assignedSpaceships = 100;
    const discreteRate = project.calculateTransferAmount() / (project.getShipOperationDuration() / 1000);
    project.assignedSpaceships = 101;
    const continuousRate = project.calculateTransferAmount() / (project.getShipOperationDuration() / 1000);
    expect(continuousRate / discreteRate).toBeCloseTo(101 / 100);
  });

  test('only ship progress shows continuous status with >100 ships', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="projects-subtab-content-wrapper"></div>');
    const ctx = {
      console,
      document: dom.window.document,
      projectElements: {},
      projectManager: {},
      formatNumber: numbers.formatNumber,
      formatBigInteger: numbers.formatBigInteger,
      formatTotalCostDisplay: () => '',
      formatTotalResourceGainDisplay: () => '',
      resources: {
        special: { spaceships: { value: 200 } },
        colony: {
          metal: { displayName: 'Metal', value: 1000, cap: Infinity, decrease(v){ this.value -= v; }, increase(v){ this.value += v; } }
        },
        surface: {},
        atmospheric: {}
      },
      buildings: {},
      colonies: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      capitalizeFirstLetter: s => s.charAt(0).toUpperCase() + s.slice(1),
      SpaceMiningProject: function () {},
      SpaceExportBaseProject: function () {},
      SpaceExportProject: function () {},
      SpaceDisposalProject: function () {},
      spaceManager: {
        getTerraformedPlanetCount: () => 0,
        getTerraformedPlanetCountIncludingCurrent: () => 1
      }
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.projectElements = projectElements;', ctx);
    const storageUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(storageUICode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);

    const attrs = { costPerShip: {}, transportPerShip: 1000 };
    const params = { name: 'spaceStorage', displayName: 'Space Storage', category: 'mega', cost: {}, duration: 1000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');

    ctx.createProjectItem(project);
    project.updateCostAndGains = () => {};
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];
    project.assignSpaceships(101);

    const mainBtn = ctx.projectElements.spaceStorage.progressButton;
    mainBtn.textContent = 'Start storage expansion (Duration: 1.00 seconds)';
    const shipBtn = ctx.projectElements.spaceStorage.shipProgressButton;

    ctx.updateSpaceStorageUI(project);

    expect(mainBtn.textContent).toBe('Start storage expansion (Duration: 1.00 seconds)');
    expect(shipBtn.textContent).toBe('Stopped');

    project.shipOperationAutoStart = true;
    ctx.updateSpaceStorageUI(project);
    expect(shipBtn.textContent).toBe('Continuous');
  });
});
