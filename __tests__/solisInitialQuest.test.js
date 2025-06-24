const { SolisManager } = require('../solis.js');

describe('SolisManager initial quest', () => {
  test('provides a quest when update runs with none active', () => {
    global.resources = { colony: { metal: { unlocked: true } } };
    const manager = new SolisManager({ metal: 1 });
    expect(manager.currentQuest).toBe(null);
    manager.update();
    expect(manager.currentQuest).not.toBe(null);
  });
});
