require('../src/js/effectable-entity.js');
const { LifeDesigner } = require('../src/js/life.js');

describe('Life design point skill boosts', () => {
  beforeEach(() => {
    global.buildings = { biodome: { active: 10 } };
    global.resources = { surface: { biomass: { value: 1 } } };
  });

  afterEach(() => {
    delete global.buildings;
    delete global.resources;
  });

  test('scales point shop totals and biodome rate per rank', () => {
    const lifeDesigner = new LifeDesigner();
    lifeDesigner.purchaseCounts.research = 5;
    lifeDesigner.activeEffects = [
      { type: 'lifeDesignPointShopMultiplier', value: 0.2 },
      { type: 'lifeDesignPointBiodomeMultiplier', value: 0.2 }
    ];
    lifeDesigner.applyActiveEffects(false);

    lifeDesigner.updateBiodomePoints(3600000);

    expect(lifeDesigner.biodomePointRate).toBeCloseTo(2.4);
    expect(lifeDesigner.maxLifeDesignPoints()).toBeCloseTo(8);
  });
});
