global.C_P_AIR = 1004;
global.EPSILON = 0.622;
global.R_AIR = 287;

const water = require('../src/js/terraforming/water-cycle.js');

describe('water rate helpers', () => {
  test('calculateWaterEvaporationRate averages day and night evaporation', () => {
    const spy = jest
      .spyOn(water.waterCycle, 'evaporationRate')
      .mockReturnValue(2);

    const result = water.calculateWaterEvaporationRate({
      zoneArea: 100,
      liquidWaterCoverage: 0.5,
      dayTemperature: 300,
      nightTemperature: 280,
      waterVaporPressure: 1000,
      avgAtmPressure: 100000,
      zonalSolarFlux: 200,
    });

    expect(spy).toHaveBeenCalled();
    expect(result).toBeCloseTo(0.1); // (2 * 50 / 1000 * 2) / 2

    spy.mockRestore();
  });

  test('calculateWaterSublimationRate averages day and night sublimation', () => {
    const spy = jest
      .spyOn(water.waterCycle, 'sublimationRate')
      .mockReturnValue(4);

    const result = water.calculateWaterSublimationRate({
      zoneArea: 50,
      iceCoverage: 0.2,
      dayTemperature: 260,
      nightTemperature: 250,
      waterVaporPressure: 500,
      avgAtmPressure: 100000,
      zonalSolarFlux: 100,
    });

    expect(spy).toHaveBeenCalled();
    expect(result).toBeCloseTo(0.04); // (4 * 10 / 1000 * 2) / 2

    spy.mockRestore();
  });
});

