const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
function createBuilding(id) {
  const config = {
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
    requiresWorker: 10,
    unlocked: true
  };
  return new Building(config, id);
}

describe('globalWorkerReduction effect', () => {
  let b1, b2;
  beforeEach(() => {
    global.buildings = {};
    global.colonies = {};
    global.projectManager = { projects: {} };
    global.populationModule = {};
    global.tabManager = {};
    global.fundingModule = {};
    global.terraforming = {};
    global.lifeDesigner = {};
    global.lifeManager = {};
    global.oreScanner = {};
    global.resources = { colony: { metal: { updateStorageCap: () => {} } } };
    global.globalEffects = new EffectableEntity({ description: 'global' });
    global.maintenanceFraction = 0.1;

    b1 = createBuilding('b1');
    b2 = createBuilding('b2');
    global.buildings.b1 = b1;
    global.buildings.b2 = b2;
  });

  test('applies worker multiplier to all buildings', () => {
    global.globalEffects.addAndReplace({
      type: 'globalWorkerReduction',
      value: 0.1,
      effectId: 'skill',
      sourceId: 'skill'
    });

    expect(b1.getEffectiveWorkerMultiplier()).toBeCloseTo(0.9);
    expect(b2.getEffectiveWorkerMultiplier()).toBeCloseTo(0.9);
  });

  test('replacement updates multiplier', () => {
    global.globalEffects.addAndReplace({ type: 'globalWorkerReduction', value: 0.1, effectId: 'skill', sourceId: 'skill' });
    global.globalEffects.addAndReplace({ type: 'globalWorkerReduction', value: 0.2, effectId: 'skill', sourceId: 'skill' });

    expect(b1.getEffectiveWorkerMultiplier()).toBeCloseTo(0.8);
    const count = b1.activeEffects.filter(e => e.type === 'workerMultiplier').length;
    expect(count).toBe(1);
  });
});
