require('../src/js/effectable-entity.js');
const { getTerraformingRequirement } = require('../src/js/terraforming/terraforming-requirements.js');
const { LifeDesign, LifeManager } = require('../src/js/life.js');

function createResource(value) {
  return {
    value,
    modifyRate: jest.fn(),
    increase: jest.fn(),
  };
}

function createBaseWorld() {
  global.getZonePercentage = () => 1 / 3;
  global.colonies = { t7_colony: { active: 0, requiresLand: 0 } };
  const gabbagGrowthTemp = 348.15;

  global.resources = {
    atmospheric: {
      carbonDioxide: createResource(0),
      oxygen: createResource(0),
      inertGas: createResource(0),
      atmosphericWater: createResource(0),
      atmosphericMethane: createResource(0),
      hydrogen: createResource(0),
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
    requirements: getTerraformingRequirement('gabbagian'),
    temperature: {
      zones: {
        tropical: { day: gabbagGrowthTemp, night: gabbagGrowthTemp },
        temperate: { day: gabbagGrowthTemp, night: gabbagGrowthTemp },
        polar: { day: gabbagGrowthTemp, night: gabbagGrowthTemp },
      },
    },
    zonalWater: {
      tropical: { liquid: 0, ice: 0, buriedIce: 0 },
      temperate: { liquid: 0, ice: 0, buriedIce: 0 },
      polar: { liquid: 0, ice: 0, buriedIce: 0 },
    },
    zonalSurface: {
      tropical: { biomass: 0, hazardousBiomass: 0 },
      temperate: { biomass: 0, hazardousBiomass: 0 },
      polar: { biomass: 0, hazardousBiomass: 0 },
    },
    biomassDyingZones: { tropical: false, temperate: false, polar: false },
    radiationPenalty: 0,
    getMagnetosphereStatus: () => true,
    calculateZonalSolarPanelMultiplier: () => 0,
  };
}

describe('LifeManager methanogenesis metabolism', () => {
  beforeEach(() => {
    createBaseWorld();
    global.lifeDesigner = { currentDesign: new LifeDesign(0, 0, 500, 0, 0, 0, 0, 0, 0) };
  });

  afterEach(() => {
    delete global.getZonePercentage;
    delete global.colonies;
    delete global.resources;
    delete global.terraforming;
    delete global.lifeDesigner;
  });

  it('does not require luminosity for growth', () => {
    resources.atmospheric.carbonDioxide.value = 264.1666666666667;
    resources.atmospheric.hydrogen.value = 40;
    const startingLiquidWater = 1e9;
    terraforming.zonalWater.tropical.liquid = 1e9;
    terraforming.zonalWater.temperate.liquid = 1e9;
    terraforming.zonalWater.polar.liquid = 1e9;

    terraforming.zonalSurface.tropical.biomass = 1e6;
    terraforming.zonalSurface.temperate.biomass = 1e6;
    terraforming.zonalSurface.polar.biomass = 1e6;

    const manager = new LifeManager();
    manager.updateLife(1_000_000);

    const totalBiomass =
      terraforming.zonalSurface.tropical.biomass +
      terraforming.zonalSurface.temperate.biomass +
      terraforming.zonalSurface.polar.biomass;
    expect(totalBiomass).toBeCloseTo(3e6 + 100, 3);
    expect(resources.atmospheric.carbonDioxide.value).toBeCloseTo(0, 3);
    expect(resources.atmospheric.hydrogen.value).toBeGreaterThan(0);
    expect(resources.atmospheric.atmosphericMethane.value).toBeCloseTo(50, 6);
    expect(resources.atmospheric.atmosphericWater.value).toBeCloseTo(172.5, 6);

    const totalLiquidWater =
      terraforming.zonalWater.tropical.liquid +
      terraforming.zonalWater.temperate.liquid +
      terraforming.zonalWater.polar.liquid;
    expect(totalLiquidWater).toBeCloseTo(startingLiquidWater * 3 - 20, 6);
  });

  it('applies anaerobic decay outputs without oxygen', () => {
    resources.atmospheric.oxygen.value = 0;
    terraforming.temperature.zones.tropical.day = 400;
    terraforming.temperature.zones.tropical.night = 400;
    terraforming.temperature.zones.temperate.day = 400;
    terraforming.temperature.zones.temperate.night = 400;
    terraforming.temperature.zones.polar.day = 400;
    terraforming.temperature.zones.polar.night = 400;

    terraforming.zonalWater.tropical.liquid = 1e9;
    terraforming.zonalWater.temperate.liquid = 1e9;
    terraforming.zonalWater.polar.liquid = 1e9;

    terraforming.zonalSurface.tropical.biomass = 1000;
    terraforming.zonalSurface.temperate.biomass = 1000;
    terraforming.zonalSurface.polar.biomass = 1000;

    const manager = new LifeManager();
    manager.updateLife(1000);

    expect(resources.atmospheric.atmosphericMethane.value).toBeCloseTo(6, 6);
    expect(resources.atmospheric.carbonDioxide.value).toBeCloseTo(18, 6);
    expect(resources.atmospheric.atmosphericWater.value).toBeCloseTo(6, 6);
  });
});
