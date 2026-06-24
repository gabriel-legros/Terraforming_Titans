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

  it('clears ringworld-only research disable effects after travel', async () => {
    const dom = await createGameDom({ trackEventListeners: false });

    try {
      const { window } = dom;
      await new Promise(resolve => setTimeout(resolve, 50));

      window.eval(`
        researchManager.addAndReplace({
          target: 'researchManager',
          targetId: 'space_elevator',
          type: 'researchDisable',
          effectId: 'ringworld-disable-space-elevator-research',
          sourceId: 'planet-parameters'
        });
        initializeGameState({ preserveManagers: true, preserveJournal: true });
      `);

      await new Promise(resolve => setTimeout(resolve, 50));

      const state = window.eval(`JSON.stringify({
        spaceElevatorDisabled: researchManager.getResearchById('space_elevator').disabled,
        hasRingworldDisableEffect: researchManager.activeEffects.some(effect => effect.effectId === 'ringworld-disable-space-elevator-research')
      })`);

      expect(JSON.parse(state)).toEqual({
        spaceElevatorDisabled: false,
        hasRingworldDisableEffect: false
      });
    } finally {
      dom.window.close();
    }
  });

  it('re-enables research when a researchDisable effect source is removed', async () => {
    const dom = await createGameDom({ trackEventListeners: false });

    try {
      const { window } = dom;
      await new Promise(resolve => setTimeout(resolve, 50));

      const state = window.eval(`JSON.stringify((() => {
        researchManager.addAndReplace({
          target: 'researchManager',
          targetId: 'space_elevator',
          type: 'researchDisable',
          effectId: 'test-disable-space-elevator-research',
          sourceId: 'test-source'
        });
        const disabledAfterAdd = researchManager.getResearchById('space_elevator').disabled;
        researchManager.removeEffect({ sourceId: 'test-source' });
        return {
          disabledAfterAdd,
          disabledAfterRemove: researchManager.getResearchById('space_elevator').disabled,
          hasDisableEffect: researchManager.activeEffects.some(effect => effect.effectId === 'test-disable-space-elevator-research')
        };
      })())`);

      expect(JSON.parse(state)).toEqual({
        disabledAfterAdd: true,
        disabledAfterRemove: false,
        hasDisableEffect: false
      });
    } finally {
      dom.window.close();
    }
  });
});
