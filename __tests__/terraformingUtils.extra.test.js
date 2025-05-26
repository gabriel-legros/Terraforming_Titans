const utils = require('../terraforming-utils.js');
const zones = require('../zones.js');
const hydrology = require('../hydrology.js');

const terra = {
  celestialParameters: { surfaceArea: 1000 },
  zonalWater: {
    tropical: { liquid: 10, ice: 100 },
    temperate: { liquid: 0, ice: 0 },
    polar: { liquid: 0, ice: 0 }
  },
  zonalSurface: {
    tropical: { dryIce: 0, biomass: 0 },
    temperate: { dryIce: 0, biomass: 0 },
    polar: { dryIce: 0, biomass: 0 }
  }
};

describe('terraforming-utils wrappers', () => {
  test('calculateAverageCoverage sums zonal coverage', () => {
    const avg = utils.calculateAverageCoverage(terra, 'liquidWater');
    const expected = zones.ZONES.reduce((sum, z) => sum + utils.calculateZonalCoverage(terra, z, 'liquidWater') * zones.getZonePercentage(z), 0);
    expect(avg).toBeCloseTo(expected, 5);
  });

  test('calculateMeltingFreezingRates delegates to hydrology', () => {
    const result = utils.calculateMeltingFreezingRates(terra, 'tropical', 280);
    const base = hydrology.calculateMeltingFreezingRates(280, 100, 10);
    expect(result.meltingRate).toBeCloseTo(base.meltingRate,5);
    expect(result.freezingRate).toBeCloseTo(base.freezingRate,5);
  });
});
