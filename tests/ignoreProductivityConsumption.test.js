const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

describe('ignoreProductivity consumption', () => {
  beforeEach(() => {
    global.resources = {
      colony: {
        energy: { value: 1000, modifyRate: jest.fn(), productionRate: 0, consumptionRate: 0 },
        water: { value: 1000, modifyRate: jest.fn(), productionRate: 0, consumptionRate: 0 }
      },
      surface: {},
      underground: {},
      atmospheric: {}
    };
  });

  test('resource with ignoreProductivity consumes even at zero productivity', () => {
    const config = {
      name: 'Biodome',
      category: 'terraforming',
      cost: { colony: {} },
      consumption: { colony: { energy: { amount: 100, ignoreProductivity: true }, water: 1 } },
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

    const building = new Building(config, 'biodome');
    building.active = 1;
    building.productivity = 0; // simulate zero productivity

    const accumulatedChanges = { colony: { energy: 0, water: 0 }, surface: {}, underground: {}, atmospheric: {} };
    building.consume(accumulatedChanges, 1000);

    expect(accumulatedChanges.colony.energy).toBeCloseTo(-100);
    expect(accumulatedChanges.colony.water).toBeCloseTo(0);
  });
});
