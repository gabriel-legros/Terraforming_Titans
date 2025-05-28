const { calculateMeltingFreezingRates } = require('../hydrology.js');
const { calculateMeltingFreezingRates: zonalRates } = require('../terraforming-utils.js');

describe('hydrology melting with buried ice', () => {
  test('calculateMeltingFreezingRates melts buried ice', () => {
    const T = 280; // above freezing
    const diff = T - 273.15;
    const res = calculateMeltingFreezingRates(T, 0, 0, 10);
    const expected = 10 * 0.0000001 * diff;
    expect(res.meltingRate).toBeCloseTo(expected);
    expect(res.freezingRate).toBe(0);
  });

  test('calculateZonalMeltingFreezingRates uses buried ice from terraforming', () => {
    const terra = { zonalWater: { polar: { ice: 5, buriedIce: 3, liquid: 1 } } };
    const T = 280;
    const diff = T - 273.15;
    const res = zonalRates(terra, 'polar', T);
    const expected = (5 + 3) * 0.0000001 * diff;
    expect(res.meltingRate).toBeCloseTo(expected);
  });
});
