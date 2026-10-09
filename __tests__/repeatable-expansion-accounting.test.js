const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('Shared repeatable expansion accounting', () => {
  let dom;
  let window;
  let resources;

  beforeAll(async () => {
    dom = await createGameDom({ trackEventListeners: false });
    window = dom.window;
    resources = window.eval('resources');
  }, 60000);

  afterAll(() => dom?.window.close());

  function createExpansion(type, continuous) {
    const project = new window[type]({
      name: type, category: 'mega', unlocked: true, repeatable: true,
      maxRepeatCount: 11, duration: continuous ? 500 : 5000,
      cost: { colony: { metal: 500 } }, attributes: {},
    }, type);
    project.autoStart = true;
    project.repeatCount = 10;
    return project;
  }

  const types = ['NuclearAlchemyFurnaceProject', 'LiftersProject',
    'SpaceStorageProject', 'HephaestusMegaconstructionProject'];

  test.each(types)('%s estimates and spends only the final fractional work', type => {
    const project = createExpansion(type, true);
    project[project.getExpansionProgressField()] = 0.9;
    resources.colony.metal.value = 60;
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.metal.value).toBe(60);
    const pending = { colony: { metal: -10 } };
    const estimate = project.estimateExpansionTick(1000, false, 1, pending);
    expect(estimate.cost.colony.metal).toBeCloseTo(50, 8);
    project.applyExpansionCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBeCloseTo(-60, 8);
    expect(project.repeatCount).toBe(11);
    expect(project.getExpansionProgressValue()).toBeCloseTo(0, 10);
  });

  test.each(types)('%s preserves progress on restart and pays only the timed remainder', type => {
    const project = createExpansion(type, false);
    project[project.getExpansionProgressField()] = 0.9;
    resources.colony.metal.value = 60;
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.metal.value).toBeCloseTo(10, 8);
    project.complete();
    expect(project.repeatCount).toBe(11);
    expect(project.getExpansionProgressValue()).toBeCloseTo(0, 10);
  });

  test.each(types)('%s carries paid work into continuous mode without charging twice', type => {
    const project = createExpansion(type, false);
    resources.colony.metal.value = 1000;
    expect(project.start(resources)).toBe(true);
    project.remainingTime = project.startingDuration / 2;
    project.duration = 500;
    project.baseDuration = 500;
    const pending = { colony: { metal: 0 } };
    const estimate = project.estimateExpansionTick(1000, false, 1, pending);
    expect(Object.values(estimate.cost.colony || {}).reduce((sum, cost) => sum + cost, 0)).toBe(0);
    // Estimation must not advance the simulation.
    expect(project.getExpansionProgressValue()).toBe(0);
    if (type === 'SpaceStorageProject') {
      expect(project.estimateExpansionStorageGainForTick(1000)).toBe(project.capacityPerCompletion);
      expect(project.getExpansionProgressValue()).toBe(0);
    }
    project.applyExpansionCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBe(0);
    expect(project.repeatCount).toBe(11);
    expect(resources.colony.metal.value).toBe(500);
  });

  test.each(types)('%s preserves prepaid credit through save/load and restart', type => {
    const project = createExpansion(type, true);
    project[project.getExpansionProgressField()] = 0.9;
    project.expansionPrepaidProgress = 0.05;
    resources.colony.metal.value = 30;
    const restored = createExpansion(type, true);
    restored.loadState(JSON.parse(JSON.stringify(project.saveState())));
    expect(restored.start(resources)).toBe(true);
    const pending = { colony: { metal: 0 } };
    const estimate = restored.estimateExpansionTick(1000, false, 1, pending);
    expect(estimate.cost.colony.metal).toBeCloseTo(25, 8);
    restored.applyExpansionCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBeCloseTo(-25, 8);
    expect(restored.repeatCount).toBe(11);
  });

  test.each(types)('%s recognizes paid timed work in older saves', type => {
    const project = createExpansion(type, false);
    resources.colony.metal.value = 1000;
    expect(project.start(resources)).toBe(true);
    project.remainingTime = project.startingDuration / 2;
    const saved = JSON.parse(JSON.stringify(project.saveState()));
    delete saved.expansionCycleProgress;
    delete saved.expansionPrepaidProgress;
    const restored = createExpansion(type, true);
    restored.loadState(saved);
    const pending = { colony: { metal: 0 } };
    restored.applyExpansionCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBe(0);
    expect(restored.repeatCount).toBe(11);
  });

  const skyTypes = ['ArtificialSkyProject', 'ArtificialCrustProject', 'AerostatStructuralNetProject'];

  function travel(project, restored, resetLevel = window.eval('GAME_RESET_LEVEL.PLANET')) {
    const manager = window.eval('new ProjectManager()');
    manager.projects = { [project.name]: project };
    manager.projectOrder = [project.name];
    const state = manager.saveTravelState(resetLevel);
    manager.projects = { [restored.name]: restored };
    manager.loadTravelState(state, resetLevel);
    return state[project.name];
  }

  test.each(['NuclearAlchemyFurnaceProject', 'LiftersProject', 'HephaestusMegaconstructionProject'])(
    '%s preserves the paid fractional timed cycle through travel', type => {
      const project = createExpansion(type, false);
      project.attributes.preserveProgressOnTravel = true;
      project.maxRepeatCount = 100;
      project[project.getExpansionProgressField()] = 0.9;
      resources.colony.metal.value = 60;
      expect(project.start(resources)).toBe(true);
      project.remainingTime = project.startingDuration / 2;
      const restored = createExpansion(type, false);
      restored.attributes.preserveProgressOnTravel = true;
      restored.maxRepeatCount = 100;
      travel(project, restored);
      restored.complete();
      expect(restored.repeatCount).toBe(11);
      expect(restored.getExpansionProgressValue()).toBeCloseTo(0, 10);
      expect(resources.colony.metal.value).toBeCloseTo(10, 8);
    }
  );

  test.each(types)('%s retains unused continuous credit through travel', type => {
    const project = createExpansion(type, true);
    project.attributes.preserveProgressOnTravel = true;
    project[project.getExpansionProgressField()] = 0.9;
    project.expansionPrepaidProgress = 0.05;
    const restored = createExpansion(type, true);
    restored.attributes.preserveProgressOnTravel = true;
    travel(project, restored);
    resources.colony.metal.value = 30;
    expect(restored.start(resources)).toBe(true);
    const pending = { colony: { metal: 0 } };
    restored.applyExpansionCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBeCloseTo(-25, 8);
    expect(restored.repeatCount).toBe(11);
  });

  test('travel restores the cycle before a lifter loader enters continuous mode', () => {
    const project = createExpansion('LiftersProject', false);
    project.expansionProgress = 0.9;
    resources.colony.metal.value = 60;
    expect(project.start(resources)).toBe(true);
    project.remainingTime = project.startingDuration / 2;
    const restored = createExpansion('LiftersProject', true);
    travel(project, restored);
    expect(restored.expansionProgress).toBeCloseTo(0.95, 10);
    const pending = { colony: { metal: 0 } };
    restored.applyExpansionCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBeCloseTo(0, 10);
    expect(restored.repeatCount).toBe(11);
  });

  test('world-local construction does not carry prepaid credit to another world', () => {
    const project = createExpansion('ArtificialSkyProject', false);
    project.segmentProgress = 0.9;
    project.expansionCycleProgress = 0.1;
    project.expansionPrepaidProgress = 0.1;
    project.isActive = true;
    const restored = createExpansion('ArtificialSkyProject', false);
    const state = travel(project, restored);
    expect(state?.expansionPrepaidProgress).toBeUndefined();
    expect(restored.expansionPrepaidProgress).toBeUndefined();
    expect(restored.segmentProgress).toBe(0);
  });

  test('a full reset does not retain expansion credit', () => {
    const project = createExpansion('NuclearAlchemyFurnaceProject', true);
    project.expansionPrepaidProgress = 0.5;
    const restored = createExpansion('NuclearAlchemyFurnaceProject', true);
    expect(travel(project, restored, window.eval('GAME_RESET_LEVEL.NEW_GAME'))).toBeUndefined();
    expect(restored.expansionPrepaidProgress).toBeUndefined();
  });

  test.each([false, true])('Stellar Engine retains its per-segment recipe (continuous=%s)', continuous => {
    const config = JSON.parse(JSON.stringify(window.eval('progressAtlasProject.storyProjects.stellarEngine')));
    config.category = 'mega';
    config.unlocked = true;
    config.duration = continuous ? 500 : 5000;
    const project = new window.StellarEngineProject(config, 'stellarEngine');
    project.assignedSpaceships = 1;
    project.segmentProgress = 0.9;
    for (const [resource, amount] of Object.entries(config.cost.colony)) {
      resources.colony[resource].value = amount * 2;
    }
    expect(project.start(resources)).toBe(true);
    const pending = {};
    if (continuous) {
      // Advance only the remaining tenth of this segment.
      project.applyCostAndGain(50, pending, 1);
    } else {
      project.complete();
    }
    for (const [resource, amount] of Object.entries(config.cost.colony)) {
      const spent = continuous ? -pending.colony[resource] : amount * 2 - resources.colony[resource].value;
      expect(spent / amount).toBeCloseTo(0.1, 10);
    }
    expect(project.repeatCount).toBe(1);
    expect(project.segmentProgress).toBeCloseTo(0, 10);
  });

  function createSky(type, continuous) {
    const project = createExpansion(type, continuous);
    project.assignedSpaceships = continuous ? 1000000 : 1;
    project.repeatCount = project.getMaxRepeats() - 1;
    project.segmentProgress = 0.9;
    project.cost.colony.metal *= 500 / project.getExpansionUnitCost().colony.metal;
    return project;
  }

  test.each(skyTypes)('%s reports retained progress plus the timed fractional cycle', type => {
    const project = createSky(type, false);
    project.repeatCount = 10;
    resources.colony.metal.value = 60;
    expect(project.start(resources)).toBe(true);
    expect(project.getBuiltSegmentsWithProgress()).toBeCloseTo(10.9, 10);
    project.remainingTime = project.startingDuration / 2;
    expect(project.getBuiltSegmentsWithProgress()).toBeCloseTo(10.95, 10);
    expect(project.getCompletionFraction() * project.getMaxRepeats()).toBeCloseTo(10.95, 10);
    project.complete();
    expect(project.getBuiltSegmentsWithProgress()).toBe(11);
  });

  test.each(skyTypes)('%s uses the same fractional construction budget', type => {
    const project = createSky(type, true);
    resources.colony.metal.value = 60;
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.metal.value).toBe(60);
    const pending = { colony: { metal: -10 } };
    const estimate = project.estimateProjectCostAndGain(1000, false, 1, pending);
    expect(estimate.cost.colony.metal).toBeCloseTo(50, 8);
    project.applyCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBeCloseTo(-60, 8);
    expect(project.repeatCount).toBe(project.getMaxRepeats());
  });

  test.each(skyTypes)('%s carries a paid fractional timed segment across mode changes', type => {
    const project = createSky(type, false);
    resources.colony.metal.value = 60;
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.metal.value).toBeCloseTo(10, 8);
    project.remainingTime = project.startingDuration / 2;
    project.duration = 500;
    project.assignedSpaceships = 1000000;
    project.finalizeAssignmentChange(false);
    expect(project.segmentProgress).toBeCloseTo(0.95, 10);
    project.applyCostAndGain(1000, null, 1);
    expect(resources.colony.metal.value).toBeCloseTo(10, 8);
    expect(project.repeatCount).toBe(project.getMaxRepeats());
  });

  test('collector estimates use collector capacity while receiver construction is paused', () => {
    const project = createExpansion('DysonSwarmReceiverProject', true);
    project.maxRepeatCount = 1;
    project.repeatCount = 1;
    project.isCompleted = true;
    project.isPaused = true;
    project.autoContinuousOperation = true;
    project.baseCollectorDuration = 500;
    project.energyPerCollector = 5e24;
    project.collectors = 9;
    project.fractionalCollectors = 0.9;
    project.collectorCost = { colony: { metal: 500 } };
    resources.colony.metal.value = 60;
    const pending = { colony: { metal: -10 } };
    const estimate = project.estimateCostAndGain(1000, false, 1, pending);
    expect(estimate.cost.colony.metal).toBeCloseTo(50, 8);
    project.applyExpansionCostAndGain(1000, pending, 1);
    expect(pending.colony.metal).toBeCloseTo(-60, 8);
    expect(project.collectors).toBe(10);
  });

  test('a mode transition finishes the locked elevator recipe before buying the next recipe', () => {
    const settings = window.eval('gameSettings');
    const previousCapacitySetting = settings.spaceAccessCapacity;
    const previousWorkers = resources.colony.workers.potential;
    settings.spaceAccessCapacity = true;
    resources.colony.workers.potential = 0;
    try {
      const config = JSON.parse(JSON.stringify(window.eval('projectParameters.spaceElevator')));
      config.unlocked = true;
      config.duration = 5000;
      config.attributes.completionEffect = [];
      config.attributes.spaceAccess.skyhookCost = { colony: { metal: 500 } };
      const SpaceElevatorProject = window.eval('projectConstructorRegistry.SpaceElevatorProject');
      const project = new SpaceElevatorProject(config, 'spaceElevator');
      project.constructionMode = 'skyhook';
      project.lockedConstructionMode = 'skyhook';
      project.expansionProgress = 0.9;
      resources.colony.metal.value = 60;
      expect(project.start(resources)).toBe(true);
      expect(resources.colony.metal.value).toBeCloseTo(10, 8);
      project.remainingTime = project.startingDuration / 2;
      project.constructionMode = 'elevator';
      project.duration = 500;
      const pending = { colony: { metal: 0 } };
      const estimate = project.estimateProjectCostAndGain(1000, false, 1, pending);
      expect(Object.values(estimate.cost.colony || {}).reduce((sum, cost) => sum + cost, 0)).toBe(0);
      project.applyCostAndGain(1000, pending, 1);
      expect(pending.colony.metal).toBeCloseTo(0, 10);
      expect(project.skyhookCount).toBe(1);
      expect(project.elevatorCount).toBe(0);
      expect(project.expansionProgress).toBeCloseTo(0, 10);
      expect(project.getConstructionMode()).toBe('elevator');
    } finally {
      settings.spaceAccessCapacity = previousCapacitySetting;
      resources.colony.workers.potential = previousWorkers;
    }
  });
});
