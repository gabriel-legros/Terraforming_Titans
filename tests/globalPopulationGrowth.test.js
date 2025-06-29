const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;

class TestPopulation extends EffectableEntity {
  constructor(){
    super({ description: 'pop' });
  }
  getEffectiveGrowthMultiplier(){
    let m = 1;
    this.activeEffects.forEach(e => {
      if(e.type === 'growthMultiplier') m *= e.value;
    });
    return m;
  }
}

describe('globalPopulationGrowth effect', () => {
  test('applies growth multiplier', () => {
    const pop = new TestPopulation();
    pop.addAndReplace({
      type: 'globalPopulationGrowth',
      value: 0.1,
      effectId: 'skill',
      sourceId: 'skill'
    });
    expect(pop.getEffectiveGrowthMultiplier()).toBeCloseTo(1.1);
  });

  test('replacement updates multiplier', () => {
    const pop = new TestPopulation();
    pop.addAndReplace({ type: 'globalPopulationGrowth', value: 0.1, effectId: 'skill', sourceId: 'skill' });
    pop.addAndReplace({ type: 'globalPopulationGrowth', value: 0.2, effectId: 'skill', sourceId: 'skill' });
    expect(pop.getEffectiveGrowthMultiplier()).toBeCloseTo(1.2);
    const count = pop.activeEffects.filter(e => e.type === 'growthMultiplier').length;
    expect(count).toBe(1);
  });
});
