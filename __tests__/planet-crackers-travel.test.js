const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('Planet Cracker travel bonuses', () => {
  test('preserves every mining cap bonus across repeated planet resets without more cracking', async () => {
    const dom = await createGameDom({ trackEventListeners: false });
    const { window } = dom;

    try {
      window.eval(`
        projectManager.projects.planetCrackers.getAssignmentKeys().forEach(key => {
          projectManager.projects.planetCrackers.crackedByType[key] = 1;
        });
        projectManager.projects.planetCrackers.applyCapBonusEffects();
        projectManager.projects.neutronStarSmasher.crackedByType.neutronStarPair = 2.5;
        projectManager.projects.neutronStarSmasher.applyCapBonusEffects();
      `);
      const readBonuses = () => JSON.parse(window.eval('JSON.stringify(IMPORT_CAP_FLAT_BONUSES)'));
      const expected = readBonuses();
      ['metal', 'silicon', 'carbon', 'water'].forEach(key => {
        expect(expected[key]).toBeGreaterThan(0);
      });
      const cracked = window.projectManager.projects.planetCrackers.getTotalCrackedPlanets();

      for (let trip = 0; trip < 2; trip += 1) {
        window.eval('initializeGameState({ resetLevel: GAME_RESET_LEVEL.PLANET });');
        expect(window.projectManager.projects.planetCrackers.getTotalCrackedPlanets()).toBe(cracked);
        expect(window.projectManager.projects.neutronStarSmasher.getTotalCrackedPlanets()).toBe(2.5);
        expect(window.eval('warpGateNetworkManager.neutronStarMergerBlackHoles')).toBe(2);
        expect(readBonuses()).toEqual(expected);
        window.projectManager.updateProjects(0);
        expect(readBonuses()).toEqual(expected);
      }
    } finally {
      dom.window.close();
    }
  }, 60000);
});
