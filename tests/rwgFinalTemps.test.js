const { copyBackToOverrideFromSandbox } = require('../src/js/rwgEquilibrate.js');

describe('copyBackToOverrideFromSandbox temperature weighting', () => {
  test('weights day and night temps by zone surface area', () => {
    global.getZonePercentage = zone => ({ tropical: 0.5, temperate: 0.3, polar: 0.2 }[zone] || 0);
    const terra = {
      temperature: {
        value: 0,
        zones: {
          tropical: { day: 100, night: 80 },
          temperate: { day: 200, night: 60 },
          polar: { day: 300, night: 40 }
        }
      },
      zonalWater: {},
      zonalSurface: {},
      zonalHydrocarbons: {}
    };
    const result = copyBackToOverrideFromSandbox({}, {}, terra);
    const expectedDay = 100 * 0.5 + 200 * 0.3 + 300 * 0.2;
    const expectedNight = 80 * 0.5 + 60 * 0.3 + 40 * 0.2;
    expect(result.finalTemps.day).toBeCloseTo(expectedDay);
    expect(result.finalTemps.night).toBeCloseTo(expectedNight);
  });
});
