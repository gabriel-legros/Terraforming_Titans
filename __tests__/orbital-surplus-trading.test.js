const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('orbital automatic surplus trading', () => {
  let dom;

  beforeAll(async () => {
    dom = await createGameDom();
  }, 30000);

  afterAll(() => dom?.window.close());

  test('sells orbital output discarded by full storage up to market saturation', () => {
    const result = dom.window.eval(`(() => {
      const followers = followersManager;
      const market = projectManager.projects.galactic_market;
      const food = resources.colony.food;
      const funding = resources.colony.funding;
      followers.enabled = true;
      followers.getAssignmentsSnapshot = () => ({ assignments: { food: 1 } });
      followers.getPerOrbitalRate = config => config.id === 'food' ? 100 : 0;
      market.booleanFlags.add('automaticSurplusTrading');
      market.getSaturationSellAmount = () => 80;
      food.unlocked = true;
      followers.rebuildOrbitalStorageCapBonusCache();
      food.updateStorageCap();
      food.value = food.cap;

      followers.produceOrbitals(1000);
      const queued = market.pendingOverflowSales.colony?.food || 0;
      const before = funding.value;
      market.applyPostProjectTrade(1000);

      return {
        queued,
        food: food.value,
        cap: food.cap,
        revenue: funding.value - before,
        expectedRevenue: 80 * market.getSellPrice('colony', 'food', 80)
      };
    })()`);

    expect(result.queued).toBe(100);
    expect(result.food).toBe(result.cap);
    expect(result.revenue).toBeCloseTo(result.expectedRevenue, 5);
  });
});
