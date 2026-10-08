const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('Underground Land Expansion paid progress', () => {
  let dom;
  let window;
  let resources;
  let planet;

  beforeAll(async () => {
    dom = await createGameDom({ trackEventListeners: false });
    window = dom.window;
    resources = window.eval('resources');
    planet = window.eval('currentPlanetParameters');
    window.eval('terraforming.celestialParameters.surfaceArea = 100000 * 10000;');
  }, 60000);

  beforeEach(() => {
    planet.specialAttributes.dynamicMass = false;
    window.eval('spaceManager.currentArtificialKey = null;');
    resources.surface.land.setReservedAmountForSource('planetarySwampification', 0);
    resources.colony.metal.value = 10000;
    resources.colony.components.value = 10000;
  });

  afterAll(() => dom?.window.close());

  function createExpansion(continuous = true, fraction = 0.9) {
    const project = new window.UndergroundExpansionProject({
      name: 'Underground Land Expansion', category: 'infrastructure',
      cost: { colony: { metal: 500, components: 50 } },
      duration: 240000, repeatable: true, unlocked: true,
      attributes: { artificialUndergroundCost: {} },
    }, 'undergroundExpansion');
    project.booleanFlags.add('androidAssist');
    project.assignedAndroids = continuous ? 100000 : 0;
    project.repeatCount = 99999;
    project.fractionalRepeatCount = fraction;
    return project;
  }

  test('the final fractional increment has matching costs, estimates, and land gain', () => {
    const project = createExpansion();
    resources.colony.metal.value = 60;
    resources.colony.components.value = 6;
    expect(project.start(resources)).toBe(true);
    expect(project.getTotalProgress()).toBeCloseTo(99999.9, 8);
    expect(resources.colony.metal.value).toBe(60);
    const changes = { colony: { metal: 0, components: 0 } };
    const estimate = project.estimateCostAndGain(1000, false, 1, changes);
    expect(estimate.cost.colony.metal).toBeCloseTo(50, 8);
    expect(estimate.cost.colony.components).toBeCloseTo(5, 8);
    expect(estimate.gain.surface.land).toBeCloseTo(0.1, 10);
    project.applyCostAndGain(1000, changes, 1);
    expect(changes.colony.metal).toBeCloseTo(-50, 8);
    expect(changes.colony.components).toBeCloseTo(-5, 8);
    expect(project.getTotalProgress()).toBe(100000);
    expect(project.isActive).toBe(false);
    expect(project.isCompleted).toBe(true);
  });

  test('small updates near the cap accumulate rather than discard fractional progress', () => {
    const project = createExpansion();
    expect(project.start(resources)).toBe(true);
    const changes = { colony: { metal: 0, components: 0 } };
    project.applyCostAndGain(project.getEffectiveDuration() * 0.05, changes, 1);
    expect(project.fractionalRepeatCount).toBeCloseTo(0.95, 10);
    expect(project.getRemainingRepeats()).toBeCloseTo(0.05, 10);
    project.applyCostAndGain(1000, changes, 1);
    expect(project.getTotalProgress()).toBe(100000);
    expect(changes.colony.metal).toBeCloseTo(-50, 8);
  });

  test.each([false, true])('restart preserves purchased progress (paused: %s)', (paused) => {
    const project = createExpansion(true, 0);
    expect(project.start(resources)).toBe(true);
    project.applyCostAndGain(project.getEffectiveDuration() * 0.9, null, 1);
    const metalAfterProgress = resources.colony.metal.value;
    project.isActive = false;
    project.isPaused = paused;
    expect(project.start(resources)).toBe(true);
    expect(project.fractionalRepeatCount).toBeCloseTo(0.9, 10);
    expect(resources.colony.metal.value).toBe(metalAfterProgress);
    project.applyCostAndGain(1000, null, 1);
    expect(project.getTotalProgress()).toBe(100000);
    expect(resources.colony.metal.value).toBeCloseTo(9500, 8);
  });

  test('a rejected start leaves fractional progress and prepaid credit intact', () => {
    const project = createExpansion();
    project.prepaidPortion = 0.05;
    resources.colony.metal.value = 0;
    expect(project.start(resources)).toBe(false);
    expect(project.fractionalRepeatCount).toBe(0.9);
    expect(project.prepaidPortion).toBe(0.05);
  });

  test('paid fractional progress survives save/load and restart', () => {
    const project = createExpansion();
    project.prepaidPortion = 0.05;
    const saved = JSON.parse(JSON.stringify(project.saveState()));
    const restored = createExpansion();
    restored.loadState(saved);
    expect(restored.start(resources)).toBe(true);
    restored.applyCostAndGain(1000, null, 1);
    expect(restored.getTotalProgress()).toBe(100000);
    expect(resources.colony.metal.value).toBeCloseTo(9975, 8);
  });

  test('switching a paid timed cycle to continuous mode does not charge again after restart', () => {
    const project = createExpansion(false, 0);
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.metal.value).toBe(9500);
    project.update(project.remainingTime / 2);
    project.assignedAndroids = 100000;
    project.adjustActiveDuration();
    expect(project.fractionalRepeatCount).toBeCloseTo(0.5, 10);
    expect(project.prepaidPortion).toBeCloseTo(0.5, 10);
    project.isActive = false;
    expect(project.start(resources)).toBe(true);
    project.applyCostAndGain(1000, null, 1);
    expect(project.getTotalProgress()).toBe(100000);
    expect(resources.colony.metal.value).toBe(9500);
  });

  test('switching fractional continuous progress to timed mode purchases only the remainder', () => {
    const project = createExpansion();
    expect(project.start(resources)).toBe(true);
    resources.colony.metal.value = 60;
    resources.colony.components.value = 6;
    project.assignedAndroids = 0;
    project.adjustActiveDuration();
    expect(project.isActive).toBe(true);
    expect(project.fractionalRepeatCount).toBeCloseTo(0.9, 10);
    expect(resources.colony.metal.value).toBeCloseTo(10, 8);
    project.update(project.remainingTime);
    expect(project.getTotalProgress()).toBe(100000);
    expect(project.isCompleted).toBe(true);
  });

  test('a partially prepaid timed top-up carries proportional work back to continuous mode', () => {
    const project = createExpansion(false);
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.metal.value).toBeCloseTo(9950, 8);
    project.update(project.remainingTime / 2);
    project.assignedAndroids = 100000;
    project.adjustActiveDuration();
    expect(project.fractionalRepeatCount).toBeCloseTo(0.95, 10);
    expect(project.prepaidPortion).toBeCloseTo(0.05, 10);
    project.applyCostAndGain(1000, null, 1);
    expect(project.getTotalProgress()).toBe(100000);
    expect(resources.colony.metal.value).toBeCloseTo(9950, 8);
  });

  test('fully prepaid progress can restart and finish without additional reserves', () => {
    const project = createExpansion();
    project.prepaidPortion = 0.1;
    resources.colony.metal.value = 0;
    resources.colony.components.value = 0;
    expect(project.start(resources)).toBe(true);
    project.applyCostAndGain(1000, null, 1);
    expect(project.getTotalProgress()).toBe(100000);
    expect(resources.colony.metal.value).toBe(0);
    expect(resources.colony.components.value).toBe(0);
  });

  test.each([false, true])('artificial substrate costs are proportional to the remaining work (continuous: %s)', (continuous) => {
    const project = createExpansion(continuous);
    window.eval("spaceManager.currentArtificialKey = 'underground-cost-test';");
    project.booleanFlags.add('shiivertArtificialUnderground');
    project.attributes.artificialUndergroundCost = { colony: { silicon: 25000000, superalloys: 100 } };
    resources.colony.silicon.value = 10000000;
    resources.colony.superalloys.value = 100;
    expect(project.start(resources)).toBe(true);
    if (continuous) {
      project.applyCostAndGain(1000, null, 1);
    } else {
      project.update(project.remainingTime);
    }
    expect(project.getTotalProgress()).toBe(100000);
    expect(resources.colony.silicon.value).toBeCloseTo(7500000, 7);
    expect(resources.colony.superalloys.value).toBeCloseTo(90, 8);
    expect(resources.colony.metal.value).toBeCloseTo(9950, 8);
  });

  test('available resources and pending spending limit the paid final increment', () => {
    const project = createExpansion();
    expect(project.start(resources)).toBe(true);
    resources.colony.metal.value = 50;
    const changes = { colony: { metal: -25, components: 0 } };
    const estimate = project.estimateCostAndGain(1000, false, 1, changes);
    expect(estimate.cost.colony.metal).toBeCloseTo(25, 8);
    expect(estimate.gain.surface.land).toBeCloseTo(0.05, 10);
    project.applyCostAndGain(1000, changes, 1);
    expect(project.fractionalRepeatCount).toBeCloseTo(0.95, 10);
    expect(changes.colony.metal).toBeCloseTo(-50, 8);
    expect(project.shortfallLastTick).toBe(true);
  });

  test('dynamic worlds retain their additional grace completion', () => {
    planet.specialAttributes.dynamicMass = true;
    const project = createExpansion();
    expect(project.start(resources)).toBe(true);
    project.applyCostAndGain(1000, null, 1);
    expect(project.repeatCount).toBe(100000);
    expect(project.getRemainingRepeats()).toBe(1);
    expect(project.isActive).toBe(true);
    project.applyCostAndGain(1000, null, 1);
    expect(project.repeatCount).toBe(100001);
    expect(project.isActive).toBe(false);
    expect(resources.colony.metal.value).toBeCloseTo(9450, 8);
  });

  test('Planetary Swampification preserves partial reservation and caps its final charge', () => {
    const Swampification = window.eval('PlanetarySwampificationProject');
    const project = new Swampification({
      name: 'Planetary Swampification', category: 'infrastructure',
      cost: { colony: { energy: 100 }, surface: { land: 1 } },
      duration: 240000, repeatable: true, unlocked: true,
      attributes: { landReservationShare: 1 },
    }, 'planetarySwampification');
    resources.surface.land.baseCap = 100000;
    resources.surface.land.cap = 100000;
    resources.surface.land.value = 100000;
    resources.colony.energy.value = 1000;
    project.booleanFlags.add('androidAssist');
    project.assignedAndroids = 100000;
    project.repeatCount = 99999;
    project.fractionalRepeatCount = 0.9;
    project.syncLandReservation();
    expect(project.start(resources)).toBe(true);
    expect(project.getReservedLand()).toBeCloseTo(99999.9, 7);
    project.applyCostAndGain(project.getEffectiveDuration() * 0.05, null, 1);
    expect(project.getReservedLand()).toBeCloseTo(99999.95, 7);
    project.applyCostAndGain(1000, null, 1);
    expect(project.getReservedLand()).toBe(100000);
    expect(resources.colony.energy.value).toBeCloseTo(990, 7);
  });
});
