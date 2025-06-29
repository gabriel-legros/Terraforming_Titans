const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../effectable-entity.js');

describe('lifeGrowthMultiplier effect', () => {
  let ctx;
  beforeEach(() => {
    ctx = { console, EffectableEntity };
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, '..', 'life.js'), 'utf8');
    vm.runInContext(code + '; this.LifeManager = LifeManager;', ctx);
    ctx.lifeManager = new ctx.LifeManager();
  });

  test('adds multiplier to life growth', () => {
    const manager = ctx.lifeManager;
    expect(manager.getEffectiveLifeGrowthMultiplier()).toBe(1);
    manager.addAndReplace({ type: 'lifeGrowthMultiplier', value: 1.5, effectId: 'test', sourceId: 'test' });
    expect(manager.getEffectiveLifeGrowthMultiplier()).toBeCloseTo(1.5);
  });

  test('replacing multiplier effect does not stack', () => {
    const manager = ctx.lifeManager;
    manager.addAndReplace({ type: 'lifeGrowthMultiplier', value: 2, effectId: 'skill', sourceId: 'skill' });
    expect(manager.getEffectiveLifeGrowthMultiplier()).toBe(2);
    manager.addAndReplace({ type: 'lifeGrowthMultiplier', value: 3, effectId: 'skill', sourceId: 'skill' });
    expect(manager.getEffectiveLifeGrowthMultiplier()).toBe(3);
  });
});
