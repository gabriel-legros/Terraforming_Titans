const { copyBackToOverrideFromSandbox } = require('../src/js/rwgEquilibrate.js');

describe('RWG equilibration zonal temperatures', () => {
  afterEach(() => {
    delete global.getZonePercentage;
  });

  test('passes equilibrated zonal temperatures into override', () => {
    const zoneFractions = { tropical: 0.5, temperate: 0.3, polar: 0.2 };
    global.getZonePercentage = zone => zoneFractions[zone] || 0;

    const override = {
      resources: { surface: {}, atmospheric: {} },
    };

    const sandboxResources = {
      surface: {
        ice: { value: 1 },
        liquidWater: { value: 2 },
        dryIce: { value: 3 },
        liquidCO2: { value: 4 },
        liquidMethane: { value: 5 },
        hydrocarbonIce: { value: 6 },
      },
      atmospheric: {
        carbonDioxide: { value: 7 },
        inertGas: { value: 8 },
        oxygen: { value: 9 },
        atmosphericWater: { value: 10 },
        atmosphericMethane: { value: 11 },
        hydrogen: { value: 12 },
        sulfuricAcid: { value: 13 },
      },
    };

    const terra = {
      zonalWater: {
        tropical: { liquid: 1, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: 2, buriedIce: 0 },
        polar: { liquid: 0, ice: 3, buriedIce: 0 },
      },
      zonalHydrocarbons: {
        tropical: { liquid: 1, ice: 0 },
        temperate: { liquid: 0, ice: 1 },
        polar: { liquid: 0, ice: 2 },
      },
      zonalSurface: {
        tropical: { biomass: 0 },
        temperate: { biomass: 0 },
        polar: { biomass: 0 },
      },
      zonalCO2: {
        tropical: { liquid: 0, ice: 0 },
        temperate: { liquid: 0, ice: 0 },
        polar: { liquid: 0, ice: 1 },
      },
      temperature: {
        value: 240,
        effectiveTempNoAtmosphere: 210,
        zones: {
          tropical: { value: 290, day: 300, night: 280 },
          temperate: { value: 250, day: 255, night: 245 },
          polar: { value: 200, day: 205, night: 195 },
        },
      },
    };

    const result = copyBackToOverrideFromSandbox(override, sandboxResources, terra);

    expect(result.zonalTemperatures).toEqual({
      tropical: { value: 290, day: 300, night: 280 },
      temperate: { value: 250, day: 255, night: 245 },
      polar: { value: 200, day: 205, night: 195 },
    });
  });
});
