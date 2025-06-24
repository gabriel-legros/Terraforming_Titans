const { SolisManager } = require('../solis.js');

describe('SolisManager tier persistence', () => {
  test('new quests respect current reward tier', () => {
    global.resources = { colony: { metal: { unlocked: true } } };
    const manager = new SolisManager({ metal: 1 });
    manager.rewardMultiplier = 3; // pressed x10 twice
    jest.spyOn(global.Math, 'random').mockReturnValue(0); // value = 1000
    const quest = manager.generateQuest();
    Math.random.mockRestore();
    expect(quest.quantity).toBe(1000 * 100);
  });
});

