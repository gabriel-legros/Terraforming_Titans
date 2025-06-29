const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

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
    requiresWorker: 10,
    unlocked: true
  };
  return new Building(config, 'testBuilding');
}

describe('addedWorkerNeed effect', () => {
  test('adds workers before multiplier', () => {
    global.maintenanceFraction = 0.1;
    const building = createBuilding();
    building.active = 1;
    building.addEffect({ type: 'addedWorkerNeed', value: 5 });
    building.addEffect({ type: 'workerMultiplier', value: 0.5 });

    expect(building.getAddedWorkerNeed()).toBe(5);
    expect(building.getTotalWorkerNeed()).toBe(15);
    const required = building.active * building.getTotalWorkerNeed() * building.getEffectiveWorkerMultiplier();
    expect(required).toBe(7.5);
  });
});
