const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('research travel effects', () => {
  jest.setTimeout(120000);

  it('restores effect-granted regular research state after travel', async () => {
    const dom = await createGameDom({ trackEventListeners: false });

    try {
      const { window } = dom;
      await new Promise(resolve => setTimeout(resolve, 50));

      window.eval(`
        [
          'modular_nuclear_reactor',
          'companion_satellite',
          'dyson_swarm_concept',
          'space_antimatter_safety_regulations'
        ].forEach(id => {
          const research = researchManager.getResearchById(id);
          research.isResearched = true;
          research.timesResearched = 1;
        });
        researchManager.reapplyEffects();
        initializeGameState({ preserveManagers: true, preserveJournal: true });
      `);

      await new Promise(resolve => setTimeout(resolve, 50));

      const state = window.eval(`JSON.stringify({
        fissionResearched: researchManager.getResearchById('fission_plant1').isResearched,
        oreScanningResearched: researchManager.getResearchById('ore_scanning').isResearched,
        dysonReceiverDisabled: researchManager.getResearchById('dyson_swarm_receiver').disabled,
        antimatterProjectUnlocked: projectManager.projects.spaceAntimatter.unlocked,
        antimatterSyncEnabled: researchManager.isBooleanFlagSet('spaceAntimatterSynchronization')
      })`);

      expect(JSON.parse(state)).toEqual({
        fissionResearched: true,
        oreScanningResearched: true,
        dysonReceiverDisabled: false,
        antimatterProjectUnlocked: true,
        antimatterSyncEnabled: true
      });
    } finally {
      dom.window.close();
    }
  });
});
