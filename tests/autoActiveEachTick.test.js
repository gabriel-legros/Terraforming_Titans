const { autoBuild } = require('../src/js/autobuild');

describe('auto active each tick', () => {
  test('automatically adjusts active buildings to target', () => {
    global.resources = { colony: { colonists: { value: 50 }, workers: { value: 0, cap: 0 } } };
    const building = {
      autoBuildPercent: 10,
      autoBuildBasis: 'population',
      autoActiveEnabled: true,
      autoBuildEnabled: false,
      count: 6,
      active: 0,
    };
    autoBuild({ Test: building });
    expect(building.active).toBe(5);
  });
});
