const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('SolisManager auto generation after completion', () => {
  test('generates a new quest after cooldown expires', () => {
    global.resources = { colony: { metal: { unlocked: true, value: 100, decrease(){} } } };
    const manager = new SolisManager({ metal: 1 });
    manager.currentQuest = { resource: 'metal', quantity: 5 };
    global.resources.colony.metal.decrease = jest.fn();

    const start = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(start);

    manager.completeQuest();

    Date.now.mockReturnValue(start + manager.questInterval - 1000);
    manager.update();
    expect(manager.currentQuest).toBe(null);

    Date.now.mockReturnValue(start + manager.questInterval + 1);
    manager.update();
    expect(manager.currentQuest).not.toBe(null);

    Date.now.mockRestore();
  });
});
