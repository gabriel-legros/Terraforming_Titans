const { waterCycle } = require('../src/js/terraforming/water-cycle.js');
const { methaneCycle } = require('../src/js/terraforming/hydrocarbon-cycle.js');
const { co2Cycle } = require('../src/js/terraforming/dry-ice-cycle.js');

describe('cycle getCoverage helpers', () => {
  test('water cycle coverage extraction', () => {
    const cache = { polar: { liquidWater: 0.2, ice: 0.5 } };
    expect(waterCycle.getCoverage('polar', cache)).toEqual({ liquidWaterCoverage: 0.2, iceCoverage: 0.5 });
    expect(waterCycle.getCoverage('temperate', cache)).toEqual({ liquidWaterCoverage: 0, iceCoverage: 0 });
  });

  test('methane cycle coverage extraction', () => {
    const cache = { polar: { liquidMethane: 0.3, hydrocarbonIce: 0.1 } };
    expect(methaneCycle.getCoverage('polar', cache)).toEqual({ liquidMethaneCoverage: 0.3, hydrocarbonIceCoverage: 0.1 });
    expect(methaneCycle.getCoverage('temperate', cache)).toEqual({ liquidMethaneCoverage: 0, hydrocarbonIceCoverage: 0 });
  });

  test('CO2 cycle coverage extraction', () => {
    const cache = { polar: { dryIce: 0.4 } };
    expect(co2Cycle.getCoverage('polar', cache)).toEqual({ dryIceCoverage: 0.4 });
    expect(co2Cycle.getCoverage('temperate', cache)).toEqual({ dryIceCoverage: 0 });
  });
});
