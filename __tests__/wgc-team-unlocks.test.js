const EffectableEntity = require('../src/js/effectable-entity');
global.EffectableEntity = EffectableEntity;

const { WarpGateCommand } = require('../src/js/wgc/wgc.js');

describe('Warp Gate Command team unlock thresholds', () => {
  afterAll(() => {
    delete global.EffectableEntity;
  });

  test('loadState derives unlocked teams from totalOperations', () => {
    const manager = new WarpGateCommand();
    manager.loadState({ enabled: true, totalOperations: 500 });
    expect(manager.unlockedTeams).toEqual([true, true, true, false]);
  });

  test('crossing a threshold flags the new team unlocked and logs it', () => {
    const manager = new WarpGateCommand();
    manager.totalOperations = 99;
    manager.refreshUnlockedTeams();

    const op = manager.operations[0];
    op.active = true;
    op.timer = 600;
    op.eventQueue = [];
    op.currentEventIndex = 0;

    manager.update(0);

    expect(manager.totalOperations).toBe(100);
    expect(manager.unlockedTeams[1]).toBe(true);
    expect(manager.logs[1].some(line => String(line).includes('unlocked'))).toBe(true);
  });
});

