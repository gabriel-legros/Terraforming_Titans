const { autoBuild, autobuildCostTracker } = require('../src/js/autobuild.js');

describe('autoBuild limited by land', () => {
  test('builds as much as land allows when target exceeds land', () => {
    const building = {
      displayName: 'Test Colony',
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildPriority: false,
      count: 0,
      requiresLand: 1,
      canAfford: () => false,
      maxBuildable: () => 10,
      landAffordCount: () => 5,
      build: jest.fn(() => true),
    };

    global.resources = {
      colony: { colonists: { value: 100 } },
      surface: { land: { value: 5, reserved: 0 } },
    };

    autobuildCostTracker.currentCosts = {};
    autoBuild({ c: building });

    expect(building.build).toHaveBeenCalledWith(5);
  });
});
