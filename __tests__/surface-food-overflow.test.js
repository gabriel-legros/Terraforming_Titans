const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('surface food automatic surplus trading', () => {
  let dom;
  let window;

  beforeAll(async () => {
    dom = await createGameDom();
    window = dom.window;
  }, 30000);

  afterAll(() => dom?.window.close());

  test('sells overflowing surface food at market saturation on the next tick', () => {
    const result = window.eval(`(() => {
      const food = resources.colony.food;
      const funding = resources.colony.funding;
      const market = projectManager.projects.galactic_market;
      const surplus = 20e12;
      const saturation = 18e12;
      lifeManager.booleanFlags.add('surfaceFoodProduction');
      market.booleanFlags.add('automaticSurplusTrading');
      market.getSaturationSellAmount = () => saturation;
      food.unlocked = true;
      food.value = food.cap;
      resources.surface.biomass.value = surplus
        / terraformingParameters.gameplay.life.surfaceBiomassFoodPerTonPerSecond;

      produceResources(1000, {});
      const queued = market.pendingOverflowSales.colony?.food || 0;
      const beforeAutomatic = funding.value;
      market.applyPostProjectTrade(1000);
      const automaticRevenue = funding.value - beforeAutomatic;

      food.value = saturation;
      market.sellSelections = [{ category: 'colony', resource: 'food', quantity: saturation }];
      market.isActive = true;
      market.manualContinuousRun = true;
      const beforeManual = funding.value;
      market.applyPostProjectTrade(1000);

      return {
        queued,
        productionRate: food.productionRate,
        automaticRevenue,
        manualRevenue: funding.value - beforeManual,
        expectedRevenue: saturation * market.getSellPrice('colony', 'food', saturation)
      };
    })()`);

    expect(result.queued).toBe(20e12);
    expect(result.productionRate).toBe(20e12);
    expect(result.automaticRevenue).toBeCloseTo(result.expectedRevenue, 0);
    expect(result.automaticRevenue).toBeCloseTo(result.manualRevenue, 0);
  });
});
