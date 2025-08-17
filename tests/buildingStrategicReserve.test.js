const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.maintenanceFraction = 0;
const { Building } = require('../src/js/building.js');

describe('Building reserve-aware affordability', () => {
  test('canAfford and maxBuildable respect strategic reserve', () => {
    global.resources = {
      colony: {
        metal: { value: 80, cap: 100 },
      },
    };

    const config = {
      name: 'Test',
      category: 'colony',
      cost: { colony: { metal: 50 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: {},
      canBeToggled: false,
      maintenanceFactor: 1,
      requiresMaintenance: false,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      surfaceArea: 0,
      requiresProductivity: true,
      requiresLand: 0,
    };

    const b = new Building(config, 'test');

    expect(b.canAfford(1, 50)).toBe(false);
    expect(b.maxBuildable(50)).toBe(0);

    resources.colony.metal.value = 150;
    resources.colony.metal.cap = 200;

    expect(b.canAfford(1, 50)).toBe(true);
    expect(b.maxBuildable(50)).toBe(1);
  });
});
