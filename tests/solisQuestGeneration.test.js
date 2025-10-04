const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('SolisManager quest generation', () => {
  test('generates quests only for unlocked resources', () => {
    global.resources = {
      colony: {
        metal: { unlocked: true },
        components: { unlocked: false }
      }
    };
    const manager = new SolisManager({ metal: 1, components: 10 });
    const quest = manager.generateQuest();
    expect(quest.resource).toBe('metal');
    expect(quest.quantity).toBeGreaterThanOrEqual(1000);
    expect(quest.quantity).toBeLessThanOrEqual(9999);
  });

  test('scales quantity by resource value', () => {
    global.resources = { colony: { metal: { unlocked: true }, components: { unlocked: true } } };
    const manager = new SolisManager({ metal: 1, components: 10 });
    jest.spyOn(global.Math, 'random').mockReturnValue(0); // ensures value = 1000
    const quest = manager.generateQuest();
    Math.random.mockRestore();
    if (quest.resource === 'components') {
      expect(quest.quantity).toBe(100);
    } else {
      expect(quest.quantity).toBe(1000);
    }
  });
});
