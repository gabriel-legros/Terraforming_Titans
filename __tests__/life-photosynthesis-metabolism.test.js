require('../src/js/effectable-entity.js');
const { LifeDesign, LifeManager } = require('../src/js/life.js');

function createResource(value) {
  return {
    value,
    modifyRate: jest.fn(),
    increase: jest.fn(),
  };
}

function createTestWorld() {
  global.getZonePercentage = () => 1 / 3;
  global.colonies = { t7_colony: { active: 0, requiresLand: 0 } };

  global.resources = {
    atmospheric: {
      carbonDioxide: createResource(0),
      oxygen: createResource(0),
      atmosphericWater: createResource(0),
    },
    surface: {
      biomass: createResource(0),
      liquidWater: createResource(0),
    },
    colony: {},
  };

    global.terraforming = {
      initialLand: 1,
      celestialParameters: { surfaceArea: 1e9 },
      requirements: {
        lifeDesign: {
        survivalTemperatureRangeK: { min: 273.15, max: 313.15 },
        optimalGrowthTemperatureBaseK: 293.15,
        growthTemperatureToleranceBaseC: 1,
        growthTemperatureTolerancePerPointC: 0.5,
        photosynthesisRatePerPoint: 0.00008,
        baseMaxBiomassDensityTPerM2: 0.1,
        radiationToleranceThresholdPoints: 25,
        minimumBiomassDecayRateTPerS: 1,
          metabolism: {
            primaryProcessId: 'photosynthesis',
            processes: {
              photosynthesis: {
                id: 'photosynthesis',
                displayName: 'Photosynthesis',
                growth: {
                  perBiomass: {
                    surface: { biomass: 1, liquidWater: -0.6 },
                    atmospheric: { carbonDioxide: -1.4666666666666666, oxygen: 1.0666666666666667 },
                  },
                },
                decay: {
                  allowSterileDecayWithoutOxygen: true,
                  perBiomass: {
                    surface: { biomass: -1 },
                    atmospheric: { oxygen: -1.0666666666666667, carbonDioxide: 1.4666666666666666, atmosphericWater: 0.6 },
                  },
                },
              },
            },
          },
        },
      },
    temperature: {
      zones: {
        tropical: { day: 293.15, night: 293.15 },
        temperate: { day: 293.15, night: 293.15 },
        polar: { day: 293.15, night: 293.15 },
      },
    },
    zonalSurface: {
      tropical: { liquidWater: 0, ice: 0, buriedIce: 0, biomass: 0, hazardousBiomass: 0 },
      temperate: { liquidWater: 0, ice: 0, buriedIce: 0, biomass: 0, hazardousBiomass: 0 },
      polar: { liquidWater: 0, ice: 0, buriedIce: 0, biomass: 0, hazardousBiomass: 0 },
    },
    biomassDyingZones: { tropical: false, temperate: false, polar: false },
    radiationPenalty: 0,
    getMagnetosphereStatus: () => true,
    calculateZonalSolarPanelMultiplier: () => 1,
  };
}

describe('LifeManager metabolism-driven photosynthesis', () => {
  beforeEach(() => {
    createTestWorld();
    global.lifeDesigner = { currentDesign: new LifeDesign(0, 0, 500, 0, 0, 0, 0, 0, 0) };
  });

  afterEach(() => {
    delete global.getZonePercentage;
    delete global.colonies;
    delete global.resources;
    delete global.terraforming;
    delete global.lifeDesigner;
  });

  it('treats atmospheric inputs as global (CO2 caps total growth)', () => {
    resources.atmospheric.carbonDioxide.value = 100;
    terraforming.zonalSurface.tropical.liquidWater = 1e9;
    terraforming.zonalSurface.temperate.liquidWater = 1e9;
    terraforming.zonalSurface.polar.liquidWater = 1e9;

    terraforming.zonalSurface.tropical.biomass = 1e6;
    terraforming.zonalSurface.temperate.biomass = 1e6;
    terraforming.zonalSurface.polar.biomass = 1e6;

    const manager = new LifeManager();
    manager.updateLife(10_000_000);

    const expectedGrowth = 100 / 1.4666666666666666;
    const totalBiomass =
      terraforming.zonalSurface.tropical.biomass +
      terraforming.zonalSurface.temperate.biomass +
      terraforming.zonalSurface.polar.biomass;
    expect(totalBiomass).toBeCloseTo(3e6 + expectedGrowth, 3);
    expect(resources.atmospheric.carbonDioxide.value).toBeCloseTo(0, 6);
  });

  it('treats surface inputs as zonal (water caps growth per zone)', () => {
    resources.atmospheric.carbonDioxide.value = 1e9;

    terraforming.zonalSurface.tropical.biomass = 1e3;
    terraforming.zonalSurface.temperate.biomass = 1e3;
    terraforming.zonalSurface.polar.biomass = 1e3;

    const waterPerBiomass = 0.6;
    terraforming.zonalSurface.tropical.liquidWater = waterPerBiomass * 10;
    terraforming.zonalSurface.temperate.liquidWater = waterPerBiomass * 20;
    terraforming.zonalSurface.polar.liquidWater = waterPerBiomass * 30;

    const manager = new LifeManager();
    manager.updateLife(10_000_000);

    expect(terraforming.zonalSurface.tropical.biomass).toBeCloseTo(1010, 3);
    expect(terraforming.zonalSurface.temperate.biomass).toBeCloseTo(1020, 3);
    expect(terraforming.zonalSurface.polar.biomass).toBeCloseTo(1030, 3);

    expect(terraforming.zonalSurface.tropical.liquidWater).toBeCloseTo(0, 6);
    expect(terraforming.zonalSurface.temperate.liquidWater).toBeCloseTo(0, 6);
    expect(terraforming.zonalSurface.polar.liquidWater).toBeCloseTo(0, 6);
  });
});
