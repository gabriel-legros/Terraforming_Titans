const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;

const { Resource } = require('../src/js/resource.js');
const { HazardManager } = require('../src/js/terraforming/hazard.js');

describe('Hazard zone penalties', () => {
  let hazardManager;
  let landResource;

  beforeEach(() => {
    landResource = new Resource({
      name: 'land',
      displayName: 'Land',
      category: 'surface',
      initialValue: 1_000,
      unlocked: true,
    });

    global.resources = {
      special: {
        crusaders: { value: 0 },
      },
      surface: {
        land: landResource,
      },
    };

    hazardManager = new HazardManager();
    hazardManager.initialize({
      hazardousBiomass: {
        baseGrowth: { value: 6, severity: 1, maxDensity: 0.01 },
        temperaturePreference: { min: 280, max: 300, severity: 0.1, unit: 'K' },
      },
    });
  });

  afterEach(() => {
    delete global.resources;
    jest.restoreAllMocks();
  });

  it('returns raw per-zone penalties in the detail breakdown', () => {
    const terraforming = {
      zonalSurface: {
        tropical: {},
        temperate: {},
        polar: {},
      },
      temperature: {
        zones: {
          tropical: { value: 310 },
          temperate: { value: 288 },
          polar: { value: 260 },
        },
      },
    };

    const details = hazardManager.calculateHazardousBiomassGrowthPenaltyDetails(
      hazardManager.parameters.hazardousBiomass,
      terraforming
    );

    expect(details.zonePenalties.tropical).toBeCloseTo(1, 5);
    expect(details.zonePenalties.polar).toBeCloseTo(2, 5);
    expect(details.zonePenalties.temperate || 0).toBe(0);
    expect(details.totalPenalty).toBeGreaterThan(0);
  });

  it('applies zone penalties during growth updates', () => {
    const penaltySpy = jest
      .spyOn(hazardManager, 'calculateHazardousBiomassGrowthPenaltyDetails')
      .mockReturnValue({
        totalPenalty: 7,
        globalPenalty: 2,
        zonePenalties: {
          tropical: 0,
          temperate: 1,
          polar: 4,
        },
      });

    const terraforming = {
      zonalSurface: {
        tropical: { hazardousBiomass: 1_000 },
        temperate: { hazardousBiomass: 1_000 },
        polar: { hazardousBiomass: 1_000 },
      },
      initialLand: 1_000_000,
      celestialParameters: {
        surfaceArea: 1_000_000,
      },
    };

    hazardManager.update(1_000, terraforming);

    expect(penaltySpy).toHaveBeenCalledTimes(1);
    const tropicalBiomass = terraforming.zonalSurface.tropical.hazardousBiomass;
    const temperateBiomass = terraforming.zonalSurface.temperate.hazardousBiomass;
    const polarBiomass = terraforming.zonalSurface.polar.hazardousBiomass;

    expect(tropicalBiomass).toBeGreaterThan(temperateBiomass);
    expect(temperateBiomass).toBeGreaterThan(polarBiomass);
  });

  it('penalizes land-heavy zones when hazardous biomass prefers liquids', () => {
    hazardManager.initialize({
      hazardousBiomass: {
        landPreference: { value: 'Liquid', severity: 0.5 },
      },
    });

    const terraforming = {
      zonalCoverageCache: {
        tropical: { liquidWater: 0, liquidCO2: 0, liquidMethane: 0 },
        temperate: { liquidWater: 0.6, liquidCO2: 0, liquidMethane: 0 },
        polar: { liquidWater: 0, liquidCO2: 0.3, liquidMethane: 0 },
      },
    };

    const details = hazardManager.calculateLandPreferencePenaltyDetails(
      terraforming,
      hazardManager.parameters.hazardousBiomass.landPreference,
    );

    expect(details.zonePenalties.tropical).toBeCloseTo(0.5, 5);
    expect(details.zonePenalties.temperate).toBeCloseTo(0.2, 5);
    expect(details.zonePenalties.polar).toBeCloseTo(0.35, 5);
  });
});
