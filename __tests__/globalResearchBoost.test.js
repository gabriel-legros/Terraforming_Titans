const EffectableEntity = require('../effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../building.js');

function createColony(id) {
  const config = {
    name: 'Colony',
    category: 'colony',
    cost: { colony: { metal: 100 } },
    consumption: {},
    production: { colony: { research: 10 } },
    storage: {},
    dayNightActivity: false,
    canBeToggled: false,
    requiresMaintenance: false,
    maintenanceFactor: 1,
    requiresDeposit: null,
    requiresWorker: 0,
    unlocked: true
  };
  return new Building(config, id);
}

describe('globalResearchBoost effect', () => {
  let c1, c2;
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
    global.resources = { colony: { metal: { updateStorageCap: () => {} }, research: { updateStorageCap: () => {} } } };
    global.globalEffects = new EffectableEntity({ description: 'global' });
    global.maintenanceFraction = 0.1;

    c1 = createColony('c1');
    c2 = createColony('c2');
    global.colonies.c1 = c1;
    global.colonies.c2 = c2;
  });

  test('applies research production multiplier to colonies', () => {
    global.globalEffects.addAndReplace({
      type: 'globalResearchBoost',
      value: 0.2,
      effectId: 'skill',
      sourceId: 'skill'
    });

    expect(c1.getEffectiveResourceProductionMultiplier('colony','research')).toBeCloseTo(1.2);
    expect(c2.getEffectiveResourceProductionMultiplier('colony','research')).toBeCloseTo(1.2);
  });

  test('replacement updates multiplier', () => {
    global.globalEffects.addAndReplace({ type: 'globalResearchBoost', value: 0.2, effectId: 'skill', sourceId: 'skill' });
    global.globalEffects.addAndReplace({ type: 'globalResearchBoost', value: 0.4, effectId: 'skill', sourceId: 'skill' });

    expect(c1.getEffectiveResourceProductionMultiplier('colony','research')).toBeCloseTo(1.4);
    const count = c1.activeEffects.filter(e => e.type === 'resourceProductionMultiplier').length;
    expect(count).toBe(1);
  });
});
