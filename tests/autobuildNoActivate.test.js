const { autoBuild } = require('../src/js/autobuild.js');

describe('autobuild without auto activation', () => {
  test('builds structures inactive when autoActive disabled', () => {
    global.resources = { colony: { colonists: { value: 100 }, workers: { value: 0, cap: 0 } } };
    const building = {
      displayName: 'Test',
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildBasis: 'population',
      autoActiveEnabled: false,
      count: 0,
      active: 0,
      requiresLand: 0,
      requiresDeposit: null,
      canAfford: () => true,
      maxBuildable: () => 10,
      build: jest.fn(function(buildCount, activate){ this.count += buildCount; if (activate) this.active += buildCount; return true; }),
      getEffectiveCost: () => ({})
    };
    autoBuild({ T: building });
    expect(building.count).toBe(10);
    expect(building.active).toBe(0);
  });
});
