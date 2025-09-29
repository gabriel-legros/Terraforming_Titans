const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

const { Resource } = require('../src/js/resource.js');
const {
  ANTIMATTER_PER_TERRAFORMED_WORLD,
  STORAGE_DURATION_SECONDS,
  produceAntimatter,
  updateAntimatterStorageCap,
} = require('../src/js/special/antimatter.js');

describe('antimatter special resource helpers', () => {
  let previousSpaceManager;
  let previousStructures;
  let resources;
  let accumulatedChanges;

  beforeEach(() => {
    previousSpaceManager = global.spaceManager;
    previousStructures = global.structures;
    global.structures = {};

    resources = {
      special: {
        antimatter: new Resource({
          name: 'antimatter',
          category: 'special',
          hasCap: true,
          baseCap: 0,
          initialValue: 0,
          unlocked: false,
        }),
      },
    };

    accumulatedChanges = { special: { antimatter: 0 } };
  });

  afterEach(() => {
    global.spaceManager = previousSpaceManager;
    global.structures = previousStructures;
  });

  test('produceAntimatter adds production based on terraformed worlds', () => {
    global.spaceManager = {
      getTerraformedPlanetCount: () => 4,
    };

    resources.special.antimatter.unlocked = true;
    produceAntimatter(1500, resources, accumulatedChanges);

    const expectedChange = 4 * ANTIMATTER_PER_TERRAFORMED_WORLD * 1.5;
    expect(accumulatedChanges.special.antimatter).toBeCloseTo(expectedChange);
    expect(resources.special.antimatter.productionRate).toBeCloseTo(
      4 * ANTIMATTER_PER_TERRAFORMED_WORLD
    );
  });

  test('updateAntimatterStorageCap scales with ten hours of production', () => {
    global.spaceManager = {
      getTerraformedPlanetCount: () => 2,
    };

    resources.special.antimatter.unlocked = true;
    updateAntimatterStorageCap(resources);

    const expectedBaseCap =
      2 * ANTIMATTER_PER_TERRAFORMED_WORLD * STORAGE_DURATION_SECONDS;
    expect(resources.special.antimatter.hasCap).toBe(true);
    expect(resources.special.antimatter.baseCap).toBe(expectedBaseCap);

    resources.special.antimatter.updateStorageCap();
    expect(resources.special.antimatter.cap).toBe(expectedBaseCap);
  });

  test('produceAntimatter does nothing when the resource is locked and disabled', () => {
    global.spaceManager = {
      getTerraformedPlanetCount: () => 3,
    };

    produceAntimatter(1000, resources, accumulatedChanges);

    expect(accumulatedChanges.special.antimatter).toBe(0);
    expect(resources.special.antimatter.productionRate).toBe(0);
  });

  test('updateAntimatterStorageCap does nothing when the resource is locked and disabled', () => {
    global.spaceManager = {
      getTerraformedPlanetCount: () => 5,
    };

    updateAntimatterStorageCap(resources);

    expect(resources.special.antimatter.baseCap).toBe(0);
    expect(resources.special.antimatter.cap).toBe(0);
  });
});
