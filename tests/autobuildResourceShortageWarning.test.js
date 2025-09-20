const { autoBuild, constructionOfficeState } = require('../src/js/autobuild.js');

describe('autobuild resource shortage warnings', () => {
  function createBuilding({ costPer = 10, percent = 10 } = {}) {
    const building = {
      name: 'factory',
      displayName: 'Factory',
      autoBuildEnabled: true,
      autoBuildPercent: percent,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      autoBuildBasis: 'population',
      count: 0,
      requiresLand: 0,
      requiresDeposit: null,
      autoBuildPartial: false,
      getEffectiveCost: jest.fn(count => ({ colony: { metal: costPer * count } })),
      canAfford: jest.fn((count, reservePercent) => {
        const metal = global.resources.colony.metal;
        const reserve = (reservePercent / 100) * (metal.cap || 0);
        return metal.value - reserve >= costPer * count;
      }),
      maxBuildable: jest.fn(reservePercent => {
        const metal = global.resources.colony.metal;
        const reserve = (reservePercent / 100) * (metal.cap || 0);
        const available = metal.value - reserve;
        return Math.max(Math.floor(available / costPer), 0);
      }),
      build: jest.fn(count => {
        building.count += count;
        return true;
      }),
    };
    return building;
  }

  afterEach(() => {
    delete global.resources;
    constructionOfficeState.strategicReserve = 0;
  });

  test('flags the resource that prevented autobuild', () => {
    constructionOfficeState.strategicReserve = 0;
    global.resources = {
      colony: {
        colonists: { value: 10 },
        metal: { value: 5, cap: 100 },
      },
      surface: { land: { value: 100, reserved: 0 } },
    };
    const building = createBuilding({ costPer: 4, percent: 20 });

    autoBuild({ factory: building });

    expect(global.resources.colony.metal.autobuildShortage).toBe(true);
    expect(building.autoBuildPartial).toBe(true);

    global.resources.colony.metal.value = 40;
    autoBuild({ factory: building });

    expect(global.resources.colony.metal.autobuildShortage).toBe(false);
  });

  test('respects strategic reserve when flagging shortages', () => {
    constructionOfficeState.strategicReserve = 80;
    global.resources = {
      colony: {
        colonists: { value: 10 },
        metal: { value: 70, cap: 100 },
      },
      surface: { land: { value: 100, reserved: 0 } },
    };
    const building = createBuilding({ costPer: 10, percent: 10 });

    autoBuild({ factory: building });

    expect(global.resources.colony.metal.autobuildShortage).toBe(true);
    expect(building.autoBuildPartial).toBe(true);

    constructionOfficeState.strategicReserve = 0;
    global.resources.colony.metal.value = 70;
    autoBuild({ factory: building });

    expect(global.resources.colony.metal.autobuildShortage).toBe(false);
  });
});
