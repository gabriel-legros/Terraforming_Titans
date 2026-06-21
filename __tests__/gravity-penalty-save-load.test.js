const { createGameDom, loadSaveFromRelativePath, advanceTicks } = require('./helpers/jsdom-game-harness');

describe('gravity penalty save loading', () => {
  jest.setTimeout(120000);

  it('applies random-world gravity building costs in the Biotania save', async () => {
    const dom = await createGameDom({ trackEventListeners: false });
    const { window } = dom;

    try {
      loadSaveFromRelativePath(window, 'test_saves/debug/biotania.json', { skipRender: true });
      advanceTicks(window, 1, 1000, { skipRender: true });

      const result = window.eval(`(() => {
        const building = buildings.componentFactory;
        const gravityEffects = building.activeEffects
          .filter((effect) => effect.effectId && effect.effectId.startsWith('gravityCostPenalty'));
        return {
          planet: spaceManager.currentPlanetKey,
          gravity: terraforming.celestialParameters.gravity,
          gravityPenaltyEnabled: terraforming.gravityPenaltyEnabled,
          gravityCostMultiplier: terraforming.gravityCostPenalty.multiplier,
          gravityEffectCount: gravityEffects.length,
          gravityComponentEffect: gravityEffects.find((effect) => effect.resourceId === 'components') || null,
          baseComponentCost: building.cost.colony.components,
          effectiveComponentCost: building.getEffectiveCost(1).colony.components
        };
      })()`);

      expect(result.planet).toBe('Biotania|moon|icy-moon|very-cold');
      expect(result.gravity).toBeGreaterThan(600);
      expect(result.gravityPenaltyEnabled).toBe(true);
      expect(result.gravityCostMultiplier).toBe(1e12);
      expect(result.gravityEffectCount).toBeGreaterThan(0);
      expect(result.gravityComponentEffect.value).toBe(1e12);
      expect(result.effectiveComponentCost / result.baseComponentCost).toBeGreaterThan(1e10);
    } finally {
      dom.window.close();
    }
  });
});
