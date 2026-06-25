const { createGameDom, loadSaveFromRelativePath, advanceTicks } = require('./helpers/jsdom-game-harness');

describe('galaxy defense load handling', () => {
  it('does not auto-launch UHF attacks after loading a save with all fleet assigned to defense', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    try {
      loadSaveFromRelativePath(window, 'test_saves/debug/defense_assignment_bug.json', { skipRender: true });

      const manager = window.getGalaxyManagerInstance();
      const faction = manager.getFaction('uhf');
      const initialUhfOperations = Array.from(manager.operationManager.operations.values())
        .filter((operation) => operation.factionId === 'uhf').length;

      expect(faction.defenseAssignments.get('-1,-3')).toBe(1361846);
      expect(faction.getOperationalFleetPower(manager)).toBe(0);

      advanceTicks(window, 12, 1000, { skipRender: true });

      const uhfOperations = Array.from(manager.operationManager.operations.values())
        .filter((operation) => operation.factionId === 'uhf');

      expect(faction.defenseAssignments.get('-1,-3')).toBe(1361846);
      expect(faction.getOperationalFleetPower(manager)).toBe(0);
      expect(uhfOperations).toHaveLength(initialUhfOperations);
    } finally {
      dom.window.close();
    }
  });
});
