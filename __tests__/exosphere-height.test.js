const path = require('path');

const { estimateExosphereHeightMeters } = require(path.join(
  '..',
  'src/js/terraforming/exosphere-utils.js'
));

describe('Exosphere height', () => {
  test('returns zero when the column is too thin', () => {
    const height = estimateExosphereHeightMeters({
      massKg: 1,
      particleMassKg: 1,
      sigmaM2: 1,
      temperatureK: 1000,
      gSurface: 10,
      surfaceAreaM2: 1
    });

    expect(height).toBe(0);
  });

  test('uses the isothermal exobase height formula', () => {
    const KB = 1.380649e-23;
    const temperatureK = 1000;
    const gSurface = 10;
    const particleMassKg = 1;
    const massKg = Math.E;
    const surfaceAreaM2 = 1;
    const sigmaM2 = 1;
    const expected = (KB * temperatureK) / (particleMassKg * gSurface);

    const height = estimateExosphereHeightMeters({
      massKg,
      particleMassKg,
      sigmaM2,
      temperatureK,
      gSurface,
      surfaceAreaM2
    });

    expect(height).toBeCloseTo(expected, 12);
  });
});
