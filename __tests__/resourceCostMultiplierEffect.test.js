const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../building.js');

describe('resourceCostMultiplier effect', () => {
  test('applies multiplier to building cost', () => {
    global.maintenanceFraction = 0;
    const building = new Building({
      name: 'Test',
      category: 'test',
      cost: { colony: { metal: 100 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: false,
      requiresMaintenance: false,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true
    }, 'testBuilding');

    building.addEffect({
      type: 'resourceCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'metal',
      value: 0.5
    });

    const multiplier = building.getEffectiveCostMultiplier('colony', 'metal');
    expect(multiplier).toBeCloseTo(0.5);

    const cost = building.getEffectiveCost(1);
    expect(cost.colony.metal).toBeCloseTo(50);
  });
});

