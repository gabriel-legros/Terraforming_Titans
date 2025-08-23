const { autoBuild } = require('../src/js/autobuild.js');

describe('autoBuild recalculates max buildable after each build', () => {
  test('later buildings use updated resource amounts', () => {
    const resource = { value: 10 };
    global.resources = {
      colony: {
        colonists: { value: 10 },
        metal: resource,
      }
    };

    const buildingA = {
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      count: 0,
      canAfford: () => resource.value >= 5,
      maxBuildable: () => Math.floor(resource.value / 5),
      build: jest.fn(() => { resource.value -= 5; }),
      autoBuildPriority: true,
    };

    const buildingB = {
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      count: 0,
      canAfford: () => resource.value >= 10,
      maxBuildable: jest.fn(() => Math.floor(resource.value / 10)),
      build: jest.fn(() => { resource.value -= 10; }),
      autoBuildPriority: false,
    };

    autoBuild({ A: buildingA, B: buildingB });

    expect(buildingA.build).toHaveBeenCalledWith(1, false);
    expect(buildingB.maxBuildable).toHaveBeenCalled();
    expect(buildingB.build).not.toHaveBeenCalled();
  });
});
