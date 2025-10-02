const { autoBuild, constructionOfficeState } = require('../src/js/autobuild.js');

describe('autobuilder global pause', () => {
  test('autoBuild skips when disabled', () => {
    global.resources = { colony: { colonists: { value: 10 } } };
    const building = {
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      count: 0,
      canAfford: () => true,
      maxBuildable: () => 1,
      build: jest.fn(() => { building.count += 1; return true; }),
    };

    constructionOfficeState.autobuilderActive = true;
    autoBuild({ A: building });
    expect(building.build).toHaveBeenCalled();

    building.build.mockClear();
    constructionOfficeState.autobuilderActive = false;
    building.autoBuildPartial = true;
    autoBuild({ A: building });
    expect(building.build).not.toHaveBeenCalled();
    expect(building.autoBuildPartial).toBe(false);

    constructionOfficeState.autobuilderActive = true; // reset
  });
});
