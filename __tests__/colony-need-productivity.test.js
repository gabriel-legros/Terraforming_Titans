const { createGameDom } = require('./helpers/jsdom-game-harness');

function getGameGlobal(window, name) {
  return window.eval(name);
}

function createAccumulatedChanges(resources) {
  const accumulatedChanges = {};
  for (const category in resources) {
    accumulatedChanges[category] = {};
    for (const resourceName in resources[category]) {
      accumulatedChanges[category][resourceName] = 0;
    }
  }
  return accumulatedChanges;
}

function resetColonyScenario(window, ratios) {
  const resources = getGameGlobal(window, 'resources');
  const colony = getGameGlobal(window, 'colonies').t4_colony;
  const needs = ['energy', 'food', 'electronics', 'androids'];

  colony.count = 1n;
  colony.active = 1n;
  colony.productivity = 1;
  colony.displayProductivity = 1;
  colony.filledNeeds.energy = 1;
  colony.filledNeeds.food = 1;
  colony.filledNeeds.electronics = 1;
  colony.filledNeeds.androids = 1;
  colony.currentNeedDemand = {};
  colony.currentNeedFulfilled = {};
  colony.currentConsumption = {};
  colony.currentFactoryHeatConsumption = {};
  colony.needProductivity = {};
  colony.luxuryResourcesEnabled.electronics = true;
  colony.luxuryResourcesEnabled.androids = true;

  resources.colony.colonists.value = 10000;
  resources.colony.colonists.cap = 10000;

  needs.forEach(resourceName => {
    const resource = resources.colony[resourceName];
    resource.value = 1e15;
    resource.reserved = 0;
    resource.availabilityRatio = ratios[resourceName];
    resource.resetRates();
  });

  return { colony, resources, needs };
}

function expectClose(actual, expected) {
  expect(actual).toBeCloseTo(expected, 10);
}

describe('colony per-need productivity', () => {
  let dom;
  let window;

  beforeAll(async () => {
    dom = await createGameDom({ trackEventListeners: false });
    window = dom.window;
    window.eval('resources = createResources(currentPlanetParameters.resources); colonies = initializeColonies(colonyParameters);');
  });

  afterAll(() => {
    dom.window.close();
  });

  test.each([
    {
      name: 'all needs fully supplied',
      ratios: { energy: 1, food: 1, electronics: 1, androids: 1 },
      outputProductivity: 1
    },
    {
      name: 'food exhausted while other needs are supplied',
      ratios: { energy: 1, food: 0, electronics: 1, androids: 1 },
      outputProductivity: 0
    },
    {
      name: 'market-sized food drain leaves only a trace available',
      ratios: { energy: 1, food: 0.00007638681304152348, electronics: 1, androids: 1 },
      outputProductivity: 0.00007638681304152348
    },
    {
      name: 'energy shortage only',
      ratios: { energy: 0.5, food: 1, electronics: 1, androids: 1 },
      outputProductivity: 0.5
    },
    {
      name: 'electronics shortage only',
      ratios: { energy: 1, food: 1, electronics: 0, androids: 1 },
      outputProductivity: 1
    },
    {
      name: 'android shortage only',
      ratios: { energy: 1, food: 1, electronics: 1, androids: 0.25 },
      outputProductivity: 1
    },
    {
      name: 'food and electronics shortages',
      ratios: { energy: 1, food: 0.4, electronics: 0.2, androids: 1 },
      outputProductivity: 0.4
    },
    {
      name: 'energy and android shortages',
      ratios: { energy: 0.75, food: 1, electronics: 1, androids: 0.1 },
      outputProductivity: 0.75
    },
    {
      name: 'energy is the limiting output need with luxury shortages',
      ratios: { energy: 0.2, food: 0.8, electronics: 0.6, androids: 0.4 },
      outputProductivity: 0.2
    },
    {
      name: 'food is the limiting output need with androids unavailable',
      ratios: { energy: 0.9, food: 0.3, electronics: 0.7, androids: 0 },
      outputProductivity: 0.3
    }
  ])('$name', ({ ratios, outputProductivity }) => {
    const { colony, resources, needs } = resetColonyScenario(window, ratios);
    const accumulatedChanges = createAccumulatedChanges(resources);

    const targetProductivity = colony.getTargetProductivity(resources, 1000);
    colony.consume(accumulatedChanges, 1000);

    expectClose(targetProductivity, outputProductivity);
    expectClose(colony.needProductivity.energy, ratios.energy);
    expectClose(colony.needProductivity.food, ratios.food);
    expectClose(colony.needProductivity.electronics, ratios.electronics);
    expectClose(colony.needProductivity.androids, ratios.androids);

    needs.forEach(resourceName => {
      const demand = colony.currentNeedDemand[resourceName];
      const fulfilled = colony.currentNeedFulfilled[resourceName];
      expect(demand).toBeGreaterThan(0);
      expectClose(fulfilled / demand, ratios[resourceName]);
      expectClose(colony.currentConsumption.colony[resourceName], fulfilled);
      expectClose(resources.colony[resourceName].consumptionRate, demand);
    });
  });
});
