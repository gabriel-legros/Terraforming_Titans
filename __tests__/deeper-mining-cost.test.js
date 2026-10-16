const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('Deeper Mining capped costs', () => {
  let dom;
  let window;
  let resources;
  let buildings;

  beforeAll(async () => {
    dom = await createGameDom({ trackEventListeners: false });
    window = dom.window;
    resources = window.eval('resources');
    buildings = window.eval('buildings');
  }, 60000);

  afterAll(() => dom?.window.close());

  function createTopUp(continuous, maxDepth = 10000) {
    const project = new window.DeeperMiningProject({
      name: 'Deeper Mining', category: 'infrastructure',
      cost: { colony: { components: 10 } }, duration: 120000,
      repeatable: true, maxDepth, unlocked: true,
      attributes: { costOreMineScaling: true },
    }, 'deeperMining');
    buildings.oreMine.count = 100000n;
    project.oreMineCount = 100000;
    project.averageDepth = maxDepth;
    project.isCompleted = true;
    project.booleanFlags.add('androidAssist');
    project.assignedAndroids = continuous ? 100001 * 100000000 : 0;
    buildings.oreMine.count = 100001n;
    project.registerMine();
    const depthGain = maxDepth - project.averageDepth;
    const unitCost = 10 * project.oreMineCount * (0.9 + 0.1 * project.averageDepth);
    return { project, depthGain, unitCost, expectedCost: unitCost * depthGain };
  }

  test.each([10000, 100000])('timed top-ups charge only the missing depth at a cap of %s', (maxDepth) => {
    const { project, expectedCost } = createTopUp(false, maxDepth);
    resources.colony.components.value = expectedCost * 2;
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.components.value).toBeCloseTo(expectedCost, 4);
    project.update(project.remainingTime);
    expect(project.averageDepth).toBe(maxDepth);
    expect(project.isCompleted).toBe(true);
    expect(project.canStart()).toBe(false);
  });

  test.each([10000, 100000])('continuous top-ups charge only the missing depth at a cap of %s', (maxDepth) => {
    const { project, expectedCost } = createTopUp(true, maxDepth);
    const initial = expectedCost * 2;
    resources.colony.components.value = initial;
    project.autoStart = true;
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.components.value).toBe(initial);
    const changes = { colony: { components: 0 } };
    const estimate = project.estimateCostAndGain(20, false, 1, changes);
    expect(estimate.cost.colony.components).toBeCloseTo(expectedCost, 4);
    project.applyCostAndGain(20, changes, 1);
    expect(-changes.colony.components).toBeCloseTo(expectedCost, 4);
    expect(project.averageDepth).toBe(maxDepth);
    expect(project.isActive).toBe(false);
    expect(project.isCompleted).toBe(true);
    const spent = changes.colony.components;
    project.applyCostAndGain(20, changes, 1);
    expect(changes.colony.components).toBe(spent);
  });

  test('a timed top-up preserves the paid depth through pause, save/load, and an increased cap', () => {
    const { project, depthGain, expectedCost } = createTopUp(false);
    resources.colony.components.value = expectedCost * 2;
    expect(project.start(resources)).toBe(true);
    project.update(project.remainingTime / 2);
    project.isActive = false;
    project.isPaused = true;
    const saved = JSON.parse(JSON.stringify(project.saveState()));
    project.loadState(saved);
    project.baseMaxDepth += 1;
    project.updateUnderworldMiningMaxDepth();
    const depthBefore = project.averageDepth;
    const resourcesBefore = resources.colony.components.value;
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.components.value).toBe(resourcesBefore);
    project.update(project.remainingTime);
    expect(project.averageDepth - depthBefore).toBeCloseTo(depthGain, 10);
  });

  test('adding a mine during a timed top-up preserves the amount of excavation paid for', () => {
    const { project, depthGain, expectedCost } = createTopUp(false);
    resources.colony.components.value = expectedCost * 2;
    expect(project.start(resources)).toBe(true);
    buildings.oreMine.count = 100002n;
    project.registerMine();
    const depthBefore = project.averageDepth;
    project.update(project.remainingTime);
    expect(project.averageDepth - depthBefore).toBeCloseTo(depthGain * 100001 / 100002, 10);
    expect(resources.colony.components.value).toBeCloseTo(expectedCost, 4);
  });

  test('continuous spending respects pending consumption and reports the actual capped rate', () => {
    const { project, unitCost, depthGain, expectedCost } = createTopUp(true);
    resources.colony.components.value = expectedCost * 2;
    expect(project.start(resources)).toBe(true);
    const changes = { colony: { components: -expectedCost * 1.5 } };
    const consumptionBefore = resources.colony.components.consumptionRate;
    const estimate = project.estimateCostAndGain(20, true, 1, changes);
    expect(estimate.cost.colony.components).toBeCloseTo(expectedCost / 2, 4);
    const depthBefore = project.averageDepth;
    project.applyCostAndGain(20, changes, 1);
    expect(project.averageDepth - depthBefore).toBeCloseTo(depthGain / 2, 10);
    expect(-changes.colony.components).toBeCloseTo(expectedCost * 2, 4);
    expect(project.shortfallLastTick).toBe(true);
    expect((project.averageDepth - depthBefore) * unitCost).toBeCloseTo(expectedCost / 2, 2);
    expect(resources.colony.components.consumptionRate - consumptionBefore).toBeCloseTo(expectedCost / 2 / 0.02, 3);
  });

  test('continuous top-ups support direct spending without an accumulator', () => {
    const { project, expectedCost } = createTopUp(true);
    resources.colony.components.value = expectedCost * 2;
    expect(project.start(resources)).toBe(true);
    project.applyCostAndGain(20, null, 1);
    expect(resources.colony.components.value).toBeCloseTo(expectedCost, 4);
    expect(project.isCompleted).toBe(true);
  });

  test('ordinary timed deepening still purchases a full depth increment', () => {
    const { project } = createTopUp(false);
    project.averageDepth = 500;
    const cost = 10 * project.oreMineCount * (0.9 + 0.1 * 500);
    resources.colony.components.value = cost * 2;
    expect(project.start(resources)).toBe(true);
    project.update(project.remainingTime);
    expect(project.averageDepth).toBe(501);
    expect(resources.colony.components.value).toBeCloseTo(cost, 4);
    expect(project.isCompleted).toBe(false);
  });
});
