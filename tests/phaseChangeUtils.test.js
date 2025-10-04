const physics = require('../src/js/physics.js');
const water = require('../src/js/water-cycle.js');
const utils = require('../src/js/phase-change-utils.js');

global.airDensity = physics.airDensity;
// constants used by utility
global.C_P_AIR = 1004;
global.EPSILON = 0.622;

describe('phase-change utility helpers', () => {
  test('psychrometricConstant computes expected value', () => {
    const res = utils.psychrometricConstant(101325, 2.45e6);
    const expected = (1004 * 101325) / (0.622 * 2.45e6);
    expect(res).toBeCloseTo(expected);
  });

  test('psychrometricConstantWaterSublimation uses latent heat of sublimation', () => {
    const atmPressure = 101325;
    const res = water.psychrometricConstantWaterSublimation(atmPressure);
    const expected = (1004 * atmPressure) / (0.622 * 2.83e6);
    expect(res).toBeCloseTo(expected);
  });

  test('penmanRate matches manual formula', () => {
    const params = {
      T: 300,
      solarFlux: 500,
      atmPressure: 101325,
      e_a: 1000,
      latentHeat: 2.45e6,
      albedo: 0.3,
      r_a: 100,
      Delta_s: water.slopeSaturationVaporPressureWater(300),
      e_s: water.saturationVaporPressureMK(300)
    };
    const gamma_s = utils.psychrometricConstant(params.atmPressure, params.latentHeat);
    const rho_a_val = physics.airDensity(params.atmPressure, params.T);
    const R_n = (1 - params.albedo) * params.solarFlux;
    const expected = ((params.Delta_s * R_n) +
                      (rho_a_val * 1004 * (params.e_s - params.e_a) / params.r_a)) /
                     ((params.Delta_s + gamma_s) * params.latentHeat);
    const res = utils.penmanRate(params);
    expect(res).toBeCloseTo(expected);
  });

  test('penmanRate clamps humidity deficit above critical temperature', () => {
    const T = 700;
    const params = {
      T,
      solarFlux: 500,
      atmPressure: 101325,
      e_a: water.saturationVaporPressureMK(T) + 1e7,
      latentHeat: 2.45e6,
      albedo: 0.3,
      r_a: 100,
      Delta_s: water.slopeSaturationVaporPressureWater(T),
      e_s: water.saturationVaporPressureMK(T),
      criticalTemperature: 647.096,
    };
    const gamma_s = utils.psychrometricConstant(params.atmPressure, params.latentHeat);
    const rho_a_val = physics.airDensity(params.atmPressure, params.T);
    const R_n = (1 - params.albedo) * params.solarFlux;
    const expected =
      (params.Delta_s * R_n + (rho_a_val * 1004 * 0) / params.r_a) /
      ((params.Delta_s + gamma_s) * params.latentHeat);
    const res = utils.penmanRate(params);
    expect(res).toBeCloseTo(expected);
  });
});

describe('meltingFreezingRates helper', () => {
  test('matches hydrology water calculation', () => {
    const params = {
      temperature: 280,
      freezingPoint: 273.15,
      availableIce: 5,
      availableLiquid: 1,
      availableBuriedIce: 2,
      zoneArea: 1
    };
    params.iceCoverage = params.availableIce / params.zoneArea;
    params.liquidCoverage = params.availableLiquid / params.zoneArea;
    const utilRes = utils.meltingFreezingRates(params);
    const hydro = require('../src/js/hydrology.js');
    const hydroRes = hydro.calculateMeltingFreezingRates(
      params.temperature,
      params.availableIce,
      params.availableLiquid,
      params.availableBuriedIce,
      params.zoneArea,
      params.iceCoverage,
      params.liquidCoverage
    );
    expect(utilRes.meltingRate).toBeCloseTo(hydroRes.meltingRate);
    expect(utilRes.freezingRate).toBeCloseTo(hydroRes.freezingRate);
  });
});

// verify cycle modules still compute rates using helpers

describe('cycle modules via utils', () => {
  test('evaporationRateWater uses penmanRate', () => {
    const T = 300;
    const solarFlux = 500;
    const atmPressure = 101325;
    const e_a = 1000;
    const expected = utils.penmanRate({
      T,
      solarFlux,
      atmPressure,
      e_a,
      latentHeat: 2.45e6,
      albedo: 0.3,
      r_a: 100,
      Delta_s: water.slopeSaturationVaporPressureWater(T),
      e_s: water.saturationVaporPressureMK(T)
    });
    const res = water.evaporationRateWater(T, solarFlux, atmPressure, e_a, 100);
    expect(res).toBeCloseTo(expected);
  });
});
