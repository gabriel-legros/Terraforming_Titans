const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('SolisManager completion cooldown', () => {
  test('cannot refresh immediately after completing a quest', () => {
    global.resources = { colony: { metal: { unlocked: true, value: 100, decrease(){} } } };
    const manager = new SolisManager({ metal: 1 });
    manager.currentQuest = { resource: 'metal', quantity: 10 };
    global.resources.colony.metal.decrease = jest.fn();
    expect(manager.completeQuest()).toBe(true);
    manager.refreshQuest();
    expect(manager.currentQuest).toBe(null);
  });
});

