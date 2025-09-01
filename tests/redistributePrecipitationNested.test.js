const { redistributePrecipitation } = require('../src/js/terraforming/phase-change-utils.js');

describe('redistributePrecipitation nested structure', () => {
  function makeZone() {
    return {
      water: { liquid: 0, ice: 0, buriedIce: 0, dryIce: 0 },
      methane: { liquid: 0, ice: 0, buriedIce: 0 },
      atmosphere: { water: 0, co2: 0, methane: 0, oxygen: 0 },
      precipitation: { rain: 0, snow: 0, methaneRain: 0, methaneSnow: 0 },
      potentialCO2Condensation: 0
    };
  }

  test('total precipitation conserved and distributed', () => {
    const terraforming = { zonalCoverageCache: {
      tropical: { liquidWater: 1 },
      temperate: { liquidWater: 0 },
      polar: { liquidWater: 0 }
    } };
    const zonalTemperatures = {
      tropical: { value: 300 },
      temperate: { value: 250 },
      polar: { value: 250 }
    };
    const zonalChanges = {
      tropical: makeZone(),
      temperate: makeZone(),
      polar: makeZone()
    };
    zonalChanges.tropical.precipitation.rain = 10;
    redistributePrecipitation(terraforming, 'water', zonalChanges, zonalTemperatures);
    const total = ['tropical','temperate','polar']
      .reduce((sum,z)=> sum + zonalChanges[z].precipitation.rain + zonalChanges[z].precipitation.snow,0);
    expect(total).toBeCloseTo(10);
    // Some precipitation should move out of tropical zone
    const moved = zonalChanges.temperate.precipitation.rain + zonalChanges.temperate.precipitation.snow +
      zonalChanges.polar.precipitation.rain + zonalChanges.polar.precipitation.snow;
    expect(moved).toBeGreaterThan(0);
  });
});
