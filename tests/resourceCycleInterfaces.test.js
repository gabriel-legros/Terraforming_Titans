global.C_P_AIR = 1004;
global.EPSILON = 0.622;

const hydrocarbon = require('../src/js/hydrocarbon-cycle.js');
const dryIce = require('../src/js/dry-ice-cycle.js');

test('methane cycle instance matches helper evaporation', () => {
  const rateObj = hydrocarbon.methaneCycle.evaporationRate({
    T: 100,
    solarFlux: 200,
    atmPressure: 1000,
    vaporPressure: 10,
    r_a: 100,
  });
  const rateFunc = hydrocarbon.evaporationRateMethane(100, 200, 1000, 10, 100);
  expect(rateFunc).toBeCloseTo(rateObj);
});

test('CO2 cycle instance matches helper sublimation', () => {
  const rateObj = dryIce.co2Cycle.sublimationRate({
    T: 200,
    solarFlux: 150,
    atmPressure: 1000,
    vaporPressure: 10,
    r_a: 100,
  });
  const rateFunc = dryIce.sublimationRateCO2(200, 150, 1000, 10, 100);
  expect(rateFunc).toBeCloseTo(rateObj);
});

test('CO2 cycle condensation factor provides ice rate', () => {
  const res = dryIce.co2Cycle.condensationRateFactor({
    zoneArea: 10,
    co2VaporPressure: 5,
    dayTemperature: 180,
    nightTemperature: 170,
  });
  expect(res).toHaveProperty('iceRate');
  expect(typeof res.iceRate).toBe('number');
});

