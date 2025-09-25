const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

describe('addResourceConsumption effect', () => {
  function makeBuilding() {
    const config = {
      name: 'Test',
      category: 'production',
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
      unlocked: true
    };
    return new Building(config, 'testBuilding');
  }

  function makeColony() {
    const config = {
      name: 'Colony',
      category: 'colony',
      cost: { colony: {} },
      consumption: { colony: { water: 1 } },
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true
    };
    return new Building(config, 'testColony');
  }

  beforeEach(() => {
    global.globalGameIsLoadingFromSave = false;
  });

  test('adds and removes consumption on building', () => {
    const b = makeBuilding();
    const effect = {
      type: 'addResourceConsumption',
      resourceCategory: 'colony',
      resourceId: 'food',
      amount: 2,
      effectId: 'e1',
      sourceId: 's1'
    };
    b.addEffect(effect);
    expect(b.getConsumptionResource('colony', 'food').amount).toBe(2);
    expect(b.getConsumption().colony.food).toBe(2);
    b.removeEffect(effect);
    expect(b.getConsumptionResource('colony', 'food').amount).toBe(0);
    expect(b.getConsumption().colony?.food).toBeUndefined();
  });

  test('adds and removes consumption on colony', () => {
    const c = makeColony();
    const effect = {
      type: 'addResourceConsumption',
      resourceCategory: 'colony',
      resourceId: 'food',
      amount: 3,
      effectId: 'e2',
      sourceId: 's2'
    };
    c.addEffect(effect);
    expect(c.getConsumptionResource('colony', 'food').amount).toBe(3);
    expect(c.getConsumptionResource('colony', 'water').amount).toBe(1);
    c.removeEffect(effect);
    expect(c.getConsumptionResource('colony', 'food').amount).toBe(0);
    expect(c.getConsumptionResource('colony', 'water').amount).toBe(1);
  });
});
