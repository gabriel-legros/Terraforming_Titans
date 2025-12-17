require('../src/js/effectable-entity.js');
const { LifeDesign } = require('../src/js/life.js');

describe('LifeDesign uses terraforming requirement lifeDesign config', () => {
  beforeEach(() => {
    global.formatNumber = (value, _short = false, decimals = 1) => Number(value).toFixed(decimals);
    global.toDisplayTemperature = value => value;
    global.getTemperatureUnit = () => 'K';
  });

  afterEach(() => {
    delete global.formatNumber;
    delete global.toDisplayTemperature;
    delete global.getTemperatureUnit;
    delete global.terraforming;
  });

  it('uses survivalTemperatureRangeK from terraforming requirements', () => {
    global.terraforming = {
      requirements: {
        lifeDesign: {
          survivalTemperatureRangeK: { min: 100, max: 200 },
          optimalGrowthTemperatureBaseK: 150,
          growthTemperatureToleranceBaseC: 1,
          growthTemperatureTolerancePerPointC: 0.5,
          photosynthesisRatePerPoint: 0.00008,
          baseMaxBiomassDensityTPerM2: 0.1,
          radiationToleranceThresholdPoints: 25,
          minimumBiomassDecayRateTPerS: 1,
        },
      },
      temperature: {
        zones: {
          tropical: { day: 150, night: 150 },
          temperate: { day: 400, night: 390 },
          polar: { day: 400, night: 390 },
        },
      },
    };

    const design = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(design.getPrimarySurvivalFailureReason()).toBeNull();
  });

  it('uses growth temperature tolerance settings from terraforming requirements', () => {
    global.terraforming = {
      requirements: {
        lifeDesign: {
          survivalTemperatureRangeK: { min: 273.15, max: 313.15 },
          optimalGrowthTemperatureBaseK: 293.15,
          growthTemperatureToleranceBaseC: 10,
          growthTemperatureTolerancePerPointC: 2,
          photosynthesisRatePerPoint: 0.00008,
          baseMaxBiomassDensityTPerM2: 0.1,
          radiationToleranceThresholdPoints: 25,
          minimumBiomassDecayRateTPerS: 1,
        },
      },
      temperature: { zones: {} },
    };

    const design = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 3, 0);
    expect(design.getGrowthTemperatureToleranceWidth()).toBe(16);
  });

  it('uses radiationToleranceThresholdPoints from terraforming requirements', () => {
    global.terraforming = {
      requirements: {
        lifeDesign: {
          survivalTemperatureRangeK: { min: 273.15, max: 313.15 },
          optimalGrowthTemperatureBaseK: 293.15,
          growthTemperatureToleranceBaseC: 1,
          growthTemperatureTolerancePerPointC: 0.5,
          photosynthesisRatePerPoint: 0.00008,
          baseMaxBiomassDensityTPerM2: 0.1,
          radiationToleranceThresholdPoints: 10,
          minimumBiomassDecayRateTPerS: 1,
        },
      },
      temperature: { zones: {} },
    };

    const design = new LifeDesign(0, 0, 0, 5, 0, 0, 0, 0, 0);
    expect(design.getRadiationMitigationRatio()).toBeCloseTo(0.5);
  });
});

