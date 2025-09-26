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

  test('only flags the limiting resource when multiple inputs are short', () => {
    constructionOfficeState.strategicReserve = 0;
    global.resources = {
      colony: {
        colonists: { value: 1000 },
        metal: { value: 500, cap: 2000 },
        superconductors: { value: 100, cap: 2000 },
      },
      surface: { land: { value: 1000, reserved: 0 } },
    };

    const building = {
      displayName: 'Fusion Reactor',
      autoBuildEnabled: true,
      autoBuildPercent: 100,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      autoBuildBasis: 'population',
      count: 0,
      requiresLand: 0,
      requiresDeposit: null,
      getEffectiveCost: jest.fn(count => ({
        colony: {
          metal: count,
          superconductors: count,
        },
      })),
      canAfford: jest.fn((count, reservePercent) => {
        const { metal, superconductors } = global.resources.colony;
        const metalReserve = (reservePercent / 100) * (metal.cap || 0);
        const superReserve = (reservePercent / 100) * (superconductors.cap || 0);
        return metal.value - metalReserve >= count && superconductors.value - superReserve >= count;
      }),
      maxBuildable: jest.fn(reservePercent => {
        const { metal, superconductors } = global.resources.colony;
        const metalReserve = (reservePercent / 100) * (metal.cap || 0);
        const superReserve = (reservePercent / 100) * (superconductors.cap || 0);
        const availableMetal = metal.value - metalReserve;
        const availableSuperconductors = superconductors.value - superReserve;
        return Math.floor(Math.max(Math.min(availableMetal, availableSuperconductors), 0));
      }),
      build: jest.fn(() => false),
    };

    autoBuild({ fusion: building });

    expect(global.resources.colony.superconductors.autobuildShortage).toBe(true);
    expect(global.resources.colony.metal.autobuildShortage).toBe(false);

    global.resources.colony.superconductors.value = 1500;

    autoBuild({ fusion: building });

    expect(global.resources.colony.superconductors.autobuildShortage).toBe(false);
    expect(global.resources.colony.metal.autobuildShortage).toBe(true);
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

  test('does not flag deposits when deposit availability is exhausted', () => {
    constructionOfficeState.strategicReserve = 0;
    global.resources = {
      colony: {
        colonists: { value: 10 },
        metal: { value: 0, cap: 100 },
      },
      surface: { land: { value: 100, reserved: 0 } },
      underground: {
        geothermal: { value: 0, reserved: 0 },
      },
    };

    const building = {
      displayName: 'Geo Plant',
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      autoBuildBasis: 'population',
      count: 0,
      requiresDeposit: { underground: { geothermal: 1 } },
      getEffectiveCost: jest.fn(count => ({
        colony: { metal: count },
        underground: { geothermal: count },
      })),
      canAfford: jest.fn(() => false),
      canAffordDeposit: jest.fn(() => false),
      canAffordLand: jest.fn(() => true),
      maxBuildable: jest.fn(() => 0),
      build: jest.fn(() => false),
    };

    autoBuild({ geoPlant: building });

    expect(building.autoBuildPartial).toBe(true);
    expect(global.resources.underground.geothermal.autobuildShortage).toBe(true);
    expect(global.resources.colony.metal.autobuildShortage).toBe(true);
  });

  test('suppresses deposit alerts when deposits are gone and nothing else is limiting', () => {
    constructionOfficeState.strategicReserve = 0;
    global.resources = {
      colony: {
        colonists: { value: 10 },
        metal: { value: 100, cap: 100 },
      },
      surface: { land: { value: 100, reserved: 0 } },
      underground: {
        geothermal: { value: 0, reserved: 0 },
      },
    };

    const building = {
      displayName: 'Geo Plant',
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      autoBuildBasis: 'population',
      count: 0,
      requiresDeposit: { underground: { geothermal: 1 } },
      getEffectiveCost: jest.fn(count => ({
        colony: { metal: count },
        underground: { geothermal: count },
      })),
      canAfford: jest.fn(() => false),
      canAffordDeposit: jest.fn(() => false),
      canAffordLand: jest.fn(() => true),
      maxBuildable: jest.fn(() => 0),
      build: jest.fn(() => false),
    };

    autoBuild({ geoPlant: building });

    expect(building.autoBuildPartial).toBe(true);
    expect(global.resources.underground.geothermal.autobuildShortage).toBe(false);
    expect(global.resources.colony.metal.autobuildShortage).toBe(false);
  });

  test('does not flag other resources when land availability is exhausted', () => {
    constructionOfficeState.strategicReserve = 0;
    global.resources = {
      colony: {
        colonists: { value: 10 },
        metal: { value: 0, cap: 100 },
      },
      surface: {
        land: { value: 0, reserved: 0 },
      },
    };

    const building = {
      displayName: 'Habitat',
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      autoBuildBasis: 'population',
      count: 0,
      requiresLand: 5,
      getEffectiveCost: jest.fn(count => ({ colony: { metal: count * 5 } })),
      canAfford: jest.fn(() => false),
      canAffordLand: jest.fn(() => false),
      maxBuildable: jest.fn(() => 0),
      build: jest.fn(() => false),
    };

    autoBuild({ habitat: building });

    expect(building.autoBuildPartial).toBe(true);
    expect(global.resources.surface.land.autobuildShortage).toBe(true);
    expect(global.resources.colony.metal.autobuildShortage).toBe(true);

    // Metal is also fully depleted so it remains a limiting resource.
  });

  test('suppresses land alerts when not enough land remains for a single build and nothing else limits progress', () => {
    constructionOfficeState.strategicReserve = 0;
    global.resources = {
      colony: {
        colonists: { value: 10 },
        metal: { value: 100, cap: 100 },
      },
      surface: {
        land: { value: 2, reserved: 0 },
      },
    };

    const building = {
      displayName: 'Habitat',
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      autoBuildBasis: 'population',
      count: 0,
      requiresLand: 5,
      getEffectiveCost: jest.fn(count => ({ colony: { metal: count } })),
      canAfford: jest.fn(() => false),
      canAffordLand: jest.fn(() => false),
      maxBuildable: jest.fn(() => 0),
      build: jest.fn(() => false),
    };

    autoBuild({ habitat: building });

    expect(building.autoBuildPartial).toBe(true);
    expect(global.resources.surface.land.autobuildShortage).toBe(false);
    expect(global.resources.colony.metal.autobuildShortage).toBe(false);
  });

  test('does not flag land when other resources constrain autobuild more severely', () => {
    constructionOfficeState.strategicReserve = 0;
    global.resources = {
      colony: {
        colonists: { value: 100 },
        metal: { value: 10, cap: 100 },
      },
      surface: {
        land: { value: 50, reserved: 0 },
      },
    };

    const building = {
      displayName: 'Habitat',
      autoBuildEnabled: true,
      autoBuildPercent: 10,
      autoBuildPriority: false,
      autoActiveEnabled: false,
      autoBuildBasis: 'population',
      count: 0,
      requiresLand: 10,
      getEffectiveCost: jest.fn(count => ({ colony: { metal: count * 10 } })),
      canAfford: jest.fn(() => false),
      canAffordLand: jest.fn(() => false),
      maxBuildable: jest.fn(() => 0),
      build: jest.fn(() => false),
    };

    autoBuild({ habitat: building });

    expect(building.autoBuildPartial).toBe(true);
    expect(global.resources.colony.metal.autobuildShortage).toBe(true);
    expect(global.resources.surface.land.autobuildShortage).toBe(false);
  });
});
