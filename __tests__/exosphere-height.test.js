const path = require('path');

const {
  estimateExosphereHeightMeters,
  estimateExobaseTemperatureK,
  EXOSPHERE_TEMP_COLUMN_SCALE
} = require(path.join('..', 'src/js/terraforming/exosphere-utils.js'));

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

  test('blends exobase temperature by column mass', () => {
    const surfaceTemperatureK = 200;
    const exosphereTemperatureK = 1000;
    const columnMassKgPerM2 = EXOSPHERE_TEMP_COLUMN_SCALE;
    const expected = surfaceTemperatureK + (exosphereTemperatureK - surfaceTemperatureK) * 0.5;

    const temperature = estimateExobaseTemperatureK({
      surfaceTemperatureK,
      exosphereTemperatureK,
      columnMassKgPerM2
    });

    expect(temperature).toBeCloseTo(expected, 6);
  });
});
