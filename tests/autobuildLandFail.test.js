const { autoBuild, autobuildCostTracker } = require('../src/js/autobuild.js');

describe('autoBuild land availability', () => {
  test('does not record cost when build fails due to no land', () => {
    const building = {
      displayName: 'Test Colony',
      autoBuildEnabled: true,
      autoBuildPercent: 1,
      autoBuildPriority: false,
      count: 0,
      requiresLand: 1,
      canAfford: () => false,
      maxBuildable: () => 1,
      build: jest.fn(() => false),
    };

    global.resources = {
      colony: { colonists: { value: 10 } },
      surface: { land: { value: 0, reserved: 0 } },
    };

    autobuildCostTracker.currentCosts = {};
    autoBuild({ c: building });

    expect(building.build).toHaveBeenCalledWith(1, false);
    expect(Object.keys(autobuildCostTracker.currentCosts).length).toBe(0);
  });
});
