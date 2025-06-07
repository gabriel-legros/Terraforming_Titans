const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../building.js');

function createBuilding() {
  const config = {
    name: 'Test',
    category: 'test',
    cost: { colony: { metal: 100 } },
    consumption: {},
    production: {},
    storage: {},
    dayNightActivity: false,
    canBeToggled: false,
    requiresMaintenance: true,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new Building(config, 'testBuilding');
}

describe('maintenanceCostMultiplier effect', () => {
  beforeEach(() => {
    global.maintenanceFraction = 0.1;
  });

  test('applies multiplier to maintenance cost', () => {
    const building = createBuilding();
    const base = building.calculateMaintenanceCost().metal;
    expect(base).toBeCloseTo(10);

    building.addEffect({
      type: 'maintenanceCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'metal',
      value: 0.5
    });

    const modified = building.calculateMaintenanceCost().metal;
    expect(modified).toBeCloseTo(5);
  });
});
