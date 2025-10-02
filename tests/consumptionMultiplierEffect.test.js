const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

function createBuilding() {
  const config = {
    name: 'Test',
    category: 'test',
    cost: { colony: {} },
    consumption: { colony: { metal: 2 } },
    production: {},
    storage: {},
    dayNightActivity: false,
    canBeToggled: false,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new Building(config, 'testBuilding');
}

describe('consumptionMultiplier effect', () => {
  test('multiplies total consumption', () => {
    const building = createBuilding();
    building.addEffect({ type: 'consumptionMultiplier', value: 2 });
    const consumption = building.getModifiedConsumption();
    expect(consumption.colony.metal).toBeCloseTo(4);
  });
});

