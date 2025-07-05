const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

function createBuilding(){
  const config = {
    name: 'Test',
    category: 'test',
    cost: {},
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
  };
  return new Building(config, 'testBuilding');
}

describe('build productivity weighting', () => {
  beforeEach(() => {
    global.resources = { colony:{}, surface:{}, underground:{}, atmospheric:{} };
  });

  test('newly built structures start inactive', () => {
    const b = createBuilding();
    b.count = 2;
    b.active = 2;
    b.productivity = 0.8;
    b.build(1);
    expect(b.count).toBe(3);
    expect(b.active).toBe(3);
    expect(b.productivity).toBeCloseTo(0.8 * 2 / 3);
  });
});
