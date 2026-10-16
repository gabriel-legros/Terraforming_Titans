const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('Hydra net construction accounting', () => {
  let dom;
  let window;
  let resources;
  let project;
  let net;

  beforeAll(async () => {
    dom = await createGameDom({ trackEventListeners: false });
    window = dom.window;
  }, 60000);

  afterAll(() => dom?.window.close());

  beforeEach(() => {
    window.eval(`
      currentPlanetParameters = getSpecialSeedParameters('hydra');
      currentPlanetParameters.rwgMeta = { specialSeedKey: 'hydra' };
      initializeGameState({ skipStoryInitialization: true });
      terraforming.calculateInitialValues();
    `);
    resources = window.eval('resources');
    project = window.projectManager.projects.hydra;
    net = window.eval('currentPlanetParameters.specialAttributes.hydra.net');
    project.assignedSpaceships = 32600;
    project.autoStart = true;
    resources.colony.superalloys.value = 1e9;
    resources.colony.energy.value = 1e15;
  });

  test('prices segments and the continuous Cost/s display from the net recipe', () => {
    expect(project.calculateSpaceshipTotalCost()).toEqual({ colony: {
      superalloys: net.costPerTon.superalloys * net.segmentMass,
      energy: net.costPerTon.energy * net.segmentMass,
    } });
    const rate = project.getNetBuildRate();
    expect(project.calculateSpaceshipTotalCost(true)).toEqual({ colony: {
      superalloys: net.costPerTon.superalloys * rate,
      energy: net.costPerTon.energy * rate,
    } });
  });

  test('estimates and spends continuous costs with an Entanglement net tooltip source', () => {
    expect(project.start(resources)).toBe(true);
    const rate = project.getNetBuildRate();
    const changes = Object.fromEntries(Object.entries(resources).map(([category, entries]) =>
      [category, Object.fromEntries(Object.keys(entries).map(key => [key, 0]))]));
    const estimate = project.estimateProjectCostAndGain(1000, false, 1, changes);
    expect(estimate.cost.colony.superalloys).toBeCloseTo(rate * net.costPerTon.superalloys, 6);
    project.applyCostAndGain(1000, changes);
    for (const key of ['superalloys', 'energy']) {
      const spent = rate * net.costPerTon[key];
      expect(changes.colony[key]).toBeCloseTo(-spent, 6);
      expect(resources.colony[key].consumptionRateByType.project['project:hydra:net'])
        .toBeCloseTo(spent, 6);
    }
  });

  test.each(['superalloys', 'energy'])('limits construction when %s runs short', resource => {
    expect(project.start(resources)).toBe(true);
    resources.colony[resource].value = net.segmentMass * net.costPerTon[resource] / 2;
    const changes = { colony: { superalloys: 0, energy: 0 } };
    // Isolate construction from combat attrition of the newly built net.
    window.ArtificialSkyProject.prototype.applyCostAndGain.call(project, 1000, changes);
    expect(project.netMass).toBeCloseTo(net.segmentMass / 2, 6);
    expect(project.shortfallLastTick).toBe(true);
    for (const key of ['superalloys', 'energy']) {
      expect(changes.colony[key]).toBeCloseTo(-net.segmentMass * net.costPerTon[key] / 2, 6);
    }
  });

  test('prepays the net recipe when construction uses timed segments', () => {
    project.assignedSpaceships = 0;
    expect(project.isContinuous()).toBe(false);
    expect(project.start(resources)).toBe(true);
    expect(resources.colony.superalloys.value).toBe(1e9 - net.segmentMass * net.costPerTon.superalloys);
    expect(resources.colony.energy.value).toBe(1e15 - net.segmentMass * net.costPerTon.energy);
  });
});
