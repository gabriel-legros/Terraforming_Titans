const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
require('../src/js/colony.js');
const Colony = global.Colony;

describe('addComfort effect', () => {
  function createColony(baseComfort = 0.5) {
    const config = {
      name: 'Test Colony',
      category: 'colony',
      description: 'Test colony for comfort effects',
      cost: { colony: {} },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      baseComfort,
      requiresLand: 0,
    };

    return new Colony(config, 'test_colony');
  }

  beforeEach(() => {
    global.globalGameIsLoadingFromSave = false;
    global.resources = { colony: {}, atmospheric: {} };
    global.buildings = {};
    global.invalidateColonyNeedCache = jest.fn();
  });

  test('calculateEffectiveComfort sums base comfort and addComfort values', () => {
    const colony = createColony(0.5);
    expect(colony.calculateEffectiveComfort()).toBe(0.5);

    const effectA = {
      type: 'addComfort',
      value: 10,
      effectId: 'comfort-1',
      sourceId: 'research-1',
    };
    colony.addEffect(effectA);
    expect(colony.calculateEffectiveComfort()).toBe(10.5);

    const effectB = {
      type: 'addComfort',
      value: 5,
      effectId: 'comfort-2',
      sourceId: 'research-2',
    };
    colony.addEffect(effectB);
    expect(colony.calculateEffectiveComfort()).toBe(15.5);

    colony.removeEffect(effectA);
    expect(colony.calculateEffectiveComfort()).toBe(5.5);
  });

  test('getComfort reflects addComfort effects', () => {
    const colony = createColony(1);
    colony.addEffect({
      type: 'addComfort',
      value: 10,
      effectId: 'comfort-3',
      sourceId: 'research-3',
    });

    expect(colony.getComfort()).toBe(11);
  });
});
