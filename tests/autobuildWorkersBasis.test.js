const { autoBuild } = require('../src/js/autobuild.js');

describe('autobuild worker basis', () => {
  test('uses worker cap when basis is workers', () => {
    global.resources = { colony: { colonists: { value: 100 }, workers: { value: 0, cap: 50 } } };
    const building = {
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildBasis: 'workers',
      count: 0,
      requiresLand: 0,
      requiresDeposit: null,
      canAfford: () => true,
      maxBuildable: () => 999,
      build: jest.fn(() => true)
    };
    autoBuild({ Test: building });
    expect(building.build).toHaveBeenCalledWith(5);
  });
});
