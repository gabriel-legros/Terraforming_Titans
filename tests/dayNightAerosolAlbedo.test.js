const physics = require('../src/js/physics.js');

test('dayNightTemperaturesModel accounts for aerosol column mass', () => {
  const params = {
    groundAlbedo: 0.2,
    flux: 100,
    rotationPeriodH: 24,
    surfacePressureBar: 1,
    composition: {},
    gSurface: 9.81,
    aerosolsSW: { calcite: 0.001 }
  };

  const noAerosols = physics.dayNightTemperaturesModel({ ...params, aerosolsSW: {} });
  const withAerosols = physics.dayNightTemperaturesModel(params);

  expect(withAerosols.albedo).toBeGreaterThan(noAerosols.albedo);

  const expected = physics.albedoAdditive({
    surfaceAlbedo: params.groundAlbedo,
    pressureBar: params.surfacePressureBar,
    composition: params.composition,
    gSurface: params.gSurface,
    aerosolsSW: params.aerosolsSW
  }).albedo;

  expect(withAerosols.albedo).toBeCloseTo(expected);
});
