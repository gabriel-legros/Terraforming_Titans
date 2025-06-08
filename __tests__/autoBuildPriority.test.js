const { autoBuild } = require('../autobuild.js');

describe('autoBuild prioritization', () => {
  test('prioritized buildings are processed first', () => {
    const order = [];
    const buildingA = {
      autoBuildEnabled: true,
      autoBuildPercent: 1,
      count: 0,
      canAfford: () => true,
      maxBuildable: () => 1,
      build: () => order.push('A'),
      autoBuildPriority: false,
    };
    const buildingB = {
      autoBuildEnabled: true,
      autoBuildPercent: 1,
      count: 0,
      canAfford: () => true,
      maxBuildable: () => 1,
      build: () => order.push('B'),
      autoBuildPriority: true,
    };
    global.resources = { colony: { colonists: { value: 10 } } };

    autoBuild({ A: buildingA, B: buildingB });

    expect(order[0]).toBe('B');
  });
});
