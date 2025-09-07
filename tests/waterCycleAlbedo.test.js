global.C_P_AIR = 1004;
global.EPSILON = 0.622;
const { WaterCycle } = require('../src/js/terraforming/water-cycle.js');
const { penmanRate } = require('../src/js/terraforming/phase-change-utils.js');

describe('WaterCycle albedo defaults', () => {
  test('evaporationRate uses configured evaporation albedo', () => {
    const wc = new WaterCycle();
    const args = { T: 300, solarFlux: 500, atmPressure: 100000, vaporPressure: 1000 };
    const expected = penmanRate({
      T: args.T,
      solarFlux: args.solarFlux,
      atmPressure: args.atmPressure,
      e_a: args.vaporPressure,
      latentHeat: wc.latentHeatVaporization,
      albedo: wc.evaporationAlbedo,
      r_a: 100,
      Delta_s: wc.slopeSaturationVaporPressureFn(args.T),
      e_s: wc.saturationVaporPressureFn(args.T),
    });
    expect(wc.evaporationRate(args)).toBeCloseTo(expected);
    expect(wc.evaporationAlbedo).toBeCloseTo(0.06);
  });

  test('sublimationRate uses configured sublimation albedo', () => {
    const wc = new WaterCycle();
    const args = { T: 250, solarFlux: 400, atmPressure: 100000, vaporPressure: 1000 };
    const expected = penmanRate({
      T: args.T,
      solarFlux: args.solarFlux,
      atmPressure: args.atmPressure,
      e_a: args.vaporPressure,
      latentHeat: wc.latentHeatSublimation,
      albedo: wc.sublimationAlbedo,
      r_a: 100,
      Delta_s: wc.slopeSaturationVaporPressureFn(args.T),
      e_s: wc.saturationVaporPressureFn(args.T),
    });
    expect(wc.sublimationRate(args)).toBeCloseTo(expected);
    expect(wc.sublimationAlbedo).toBeCloseTo(0.6);
  });
});
