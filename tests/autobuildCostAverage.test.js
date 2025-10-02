const { autobuildCostTracker } = require('../src/js/autobuild.js');

describe('autobuild cost tracker averaging', () => {
  beforeEach(() => {
    autobuildCostTracker.elapsed = 0;
    autobuildCostTracker.currentCosts = {};
    autobuildCostTracker.currentBuildingCosts = {};
    autobuildCostTracker.costQueue = [];
    autobuildCostTracker.buildingCostQueue = [];
  });

  test('carries over elapsed overflow for accurate average', () => {
    autobuildCostTracker.recordCost('Habitat', { colony: { metal: 5 } });
    autobuildCostTracker.update(1001);
    autobuildCostTracker.recordCost('Habitat', { colony: { metal: 15 } });
    autobuildCostTracker.update(999);
    expect(autobuildCostTracker.costQueue.length).toBe(2);
    expect(autobuildCostTracker.getAverageCost('colony', 'metal')).toBe(10);
  });
});
