describe('LiftersProject', () => {
  let LiftersProject;
  let resources;
  let projectManager;
  let buildings;
  let updateSpaceStorageUI;

  const loadProject = () => {
    const EffectableEntity = require('../src/js/effectable-entity');
    global.EffectableEntity = EffectableEntity;
    const { Project } = require('../src/js/projects.js');
    global.Project = Project;
    const TerraformingDurationProject = require('../src/js/projects/TerraformingDurationProject.js');
    global.TerraformingDurationProject = TerraformingDurationProject;
    LiftersProject = require('../src/js/projects/LiftersProject.js');
  };

  const createProject = () => new LiftersProject({
    name: 'Lifters',
    category: 'mega',
    cost: { colony: { superalloys: 1 } },
    duration: 600000,
    description: '',
    repeatable: true,
    unlocked: true,
    attributes: { canUseSpaceStorage: true },
  }, 'lifters');

  const createResource = (value = 0) => {
    const resource = {
      value,
      modifyRate: jest.fn(),
      decrease: jest.fn((amount) => {
        resource.value = Math.max(0, resource.value - amount);
      }),
      increase: jest.fn((amount) => {
        resource.value += amount;
      }),
    };
    return resource;
  };

  const createAccumulatedChanges = () => ({
    colony: { energy: 0 },
    atmospheric: {
      oxygen: 0,
      carbonDioxide: 0,
      inertGas: 0,
    },
  });

  const createStorage = () => {
    const storage = {
      repeatCount: 1,
      capacityPerCompletion: 1_000_000_000,
      usedStorage: 0,
      resourceUsage: {},
    };
    Object.defineProperty(storage, 'maxStorage', {
      get() {
        return this.repeatCount * this.capacityPerCompletion;
      },
    });
    return storage;
  };

  const setupGlobals = () => {
    resources = {
      colony: { energy: createResource(1e18) },
      atmospheric: {
        oxygen: createResource(6_000_000),
        carbonDioxide: createResource(4_000_000),
        inertGas: createResource(0),
      },
    };
    resources.atmospheric.oxygen.modifyRate.mockReset();
    resources.atmospheric.carbonDioxide.modifyRate.mockReset();
    resources.atmospheric.inertGas.modifyRate.mockReset();
    projectManager = {
      projects: {
        spaceStorage: createStorage(),
        dysonSwarmReceiver: { collectors: 0, energyPerCollector: 0 },
      },
    };
    buildings = { dysonReceiver: { active: 0, production: { colony: { energy: 0 } }, productivity: 0 } };
    updateSpaceStorageUI = jest.fn();
    global.resources = resources;
    global.projectManager = projectManager;
    global.buildings = buildings;
    global.updateSpaceStorageUI = updateSpaceStorageUI;
    global.formatNumber = (value) => value;
  };

  beforeEach(() => {
    jest.resetModules();
    loadProject();
    setupGlobals();
  });

  afterEach(() => {
    delete global.Project;
    delete global.EffectableEntity;
    delete global.TerraformingDurationProject;
    delete global.projectManager;
    delete global.resources;
    delete global.buildings;
    delete global.updateSpaceStorageUI;
    delete global.formatNumber;
    delete global.spaceManager;
    jest.resetModules();
  });

  it('divides build duration by terraformed worlds', () => {
    global.spaceManager = {
      getTerraformedPlanetCountIncludingCurrent: () => 3,
    };
    const project = createProject();
    expect(project.getBaseDuration()).toBe(200000);
  });

  it('persists repeat count and mode across travel while resetting run state', () => {
    const project = createProject();
    project.repeatCount = 7;
    project.isActive = true;
    project.remainingTime = 120000;
    project.startingDuration = 180000;
    project.setMode('stripAtmosphere');
    project.setRunning(true);

    const state = project.saveTravelState();

    expect(state).toEqual({
      repeatCount: 7,
      mode: 'stripAtmosphere',
      isActive: true,
      remainingTime: 120000,
      startingDuration: 180000,
    });

    loadProject();
    const restored = createProject();
    restored.loadTravelState(state);

    expect(restored.repeatCount).toBe(7);
    expect(restored.isActive).toBe(true);
    expect(restored.remainingTime).toBe(120000);
    expect(restored.startingDuration).toBe(180000);
    expect(restored.mode).toBe('stripAtmosphere');
    expect(restored.isRunning).toBe(false);
  });

  it('resets timers when no active build persists', () => {
    global.spaceManager = {
      getTerraformedPlanetCountIncludingCurrent: () => 2,
    };
    const project = createProject();
    const expectedDuration = project.getEffectiveDuration();

    const restored = createProject();
    restored.loadTravelState({ repeatCount: 4 });

    expect(restored.repeatCount).toBe(4);
    expect(restored.isActive).toBe(false);
    expect(restored.remainingTime).toBe(expectedDuration);
    expect(restored.startingDuration).toBe(expectedDuration);
  });

  it('stores hydrogen in space storage while consuming colony energy', () => {
    const project = createProject();
    project.repeatCount = 2;
    project.setRunning(true);
    const storage = projectManager.projects.spaceStorage;
    const changes = createAccumulatedChanges();

    project.applyCostAndGain(1000, changes, 1);

    const expectedUnits = project.unitRatePerLifter * project.repeatCount;
    expect(storage.resourceUsage.hydrogen).toBe(expectedUnits);
    expect(storage.usedStorage).toBe(expectedUnits);
    expect(changes.colony.energy).toBe(-expectedUnits * project.energyPerUnit);
    expect(resources.colony.energy.decrease).not.toHaveBeenCalled();
    expect(project.lastHydrogenPerSecond).toBe(expectedUnits);
    expect(project.statusText).toBe('Running');
  });

  it('strips the atmosphere proportionally when in strip mode', () => {
    const project = createProject();
    project.repeatCount = 1;
    project.setMode('stripAtmosphere');
    project.setRunning(true);
    const changes = createAccumulatedChanges();

    project.applyCostAndGain(1000, changes, 1);

    const totalRemoved = project.lastAtmospherePerSecond;
    expect(totalRemoved).toBe(project.unitRatePerLifter);
    expect(changes.atmospheric.oxygen).toBeCloseTo(-(project.unitRatePerLifter * 0.6));
    expect(changes.atmospheric.carbonDioxide).toBeCloseTo(-(project.unitRatePerLifter * 0.4));
    expect(project.lastHydrogenPerSecond).toBe(0);
    expect(project.statusText).toBe('Running');
  });

  it('uses Dyson overflow energy when colony energy is unavailable', () => {
    const project = createProject();
    project.repeatCount = 1;
    project.setRunning(true);
    resources.colony.energy.value = 0;
    const storage = projectManager.projects.spaceStorage;
    storage.usedStorage = 0;
    projectManager.projects.dysonSwarmReceiver = { collectors: 5, energyPerCollector: 1000 };
    buildings.dysonReceiver = { active: 0, production: { colony: { energy: 1000 } }, productivity: 0 };
    const changes = createAccumulatedChanges();

    project.applyCostAndGain(1000, changes, 1);

    expect(changes.colony.energy).toBe(0);
    expect(storage.resourceUsage.hydrogen).toBeGreaterThan(0);
    expect(project.lastDysonEnergyPerSecond).toBeGreaterThan(0);
    expect(project.statusText).toBe('Running');
  });

  it('draws from Dyson overflow before consuming colony energy when both are available', () => {
    const project = createProject();
    project.repeatCount = 1;
    project.setRunning(true);
    projectManager.projects.dysonSwarmReceiver = { collectors: 5, energyPerCollector: 1_000_000 };
    buildings.dysonReceiver = { active: 0, production: { colony: { energy: 1_000_000 } }, productivity: 0 };
    const changes = createAccumulatedChanges();

    project.applyCostAndGain(1000, changes, 1);

    const expectedTotal = project.unitRatePerLifter * project.energyPerUnit;
    expect(project.lastDysonEnergyPerSecond).toBe(5_000_000);
    expect(changes.colony.energy).toBe(-(expectedTotal - project.lastDysonEnergyPerSecond));
    expect(project.statusText).toBe('Running');
  });

  it('reports lifting energy usage in estimateCostAndGain when running', () => {
    const project = createProject();
    project.repeatCount = 1;
    project.setRunning(true);
    resources.colony.energy.modifyRate.mockReset();

    project.estimateCostAndGain(1000, true, 1);

    expect(resources.colony.energy.modifyRate).toHaveBeenCalledWith(
      -(project.unitRatePerLifter * project.energyPerUnit),
      'Lifting',
      'project',
    );
  });
});
