const EffectableEntity = require('../effectable-entity.js');

global.EffectableEntity = EffectableEntity;

describe('globalCostReduction effect', () => {
  let building, colony;
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

    building = new EffectableEntity({ description: 'building' });
    building.name = 'b1';
    building.cost = { colony: { metal: 100 } };
    global.buildings.b1 = building;

    colony = new EffectableEntity({ description: 'colony' });
    colony.name = 'c1';
    colony.cost = { colony: { metal: 50 } };
    global.colonies.c1 = colony;
  });

  test('applies cost multiplier to all entities', () => {
    global.globalEffects.addAndReplace({
      type: 'globalCostReduction',
      value: 0.1,
      effectId: 'skill',
      sourceId: 'skill'
    });

    expect(building.getEffectiveCostMultiplier('colony', 'metal')).toBeCloseTo(0.9);
    expect(colony.getEffectiveCostMultiplier('colony', 'metal')).toBeCloseTo(0.9);
  });

  test('replacement updates multiplier', () => {
    global.globalEffects.addAndReplace({
      type: 'globalCostReduction',
      value: 0.1,
      effectId: 'skill',
      sourceId: 'skill'
    });
    global.globalEffects.addAndReplace({
      type: 'globalCostReduction',
      value: 0.2,
      effectId: 'skill',
      sourceId: 'skill'
    });

    expect(building.getEffectiveCostMultiplier('colony', 'metal')).toBeCloseTo(0.8);
    expect(building.activeEffects.length).toBe(1);
  });
});
