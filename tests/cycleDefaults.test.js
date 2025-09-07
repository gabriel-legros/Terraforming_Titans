const { WaterCycle } = require('../src/js/terraforming/water-cycle.js');
const { MethaneCycle } = require('../src/js/terraforming/hydrocarbon-cycle.js');
const { CO2Cycle } = require('../src/js/terraforming/dry-ice-cycle.js');

describe('cycle default parameters', () => {
  test('water cycle uses constructor defaults', () => {
    const wc = new WaterCycle({ gravity: 9, condensationParameter: 2 });
    wc.redistributePrecipitation = () => {};
    const tf = {
      temperature: { zones: { tropical: {} } },
      zonalCoverageCache: { tropical: { zoneArea: 1 } },
      calculateZoneSolarFlux: () => 0,
      zonalWater: { tropical: { liquid: 5 } },
      celestialParameters: { surfaceArea: 1 },
    };
    const spy = jest.spyOn(wc, 'processZone').mockReturnValue({ atmosphere: { water: 0 }, water: {} });
    const result = wc.runCycle(tf, ['tropical'], {
      atmPressure: 0,
      vaporPressure: 0,
      available: 0,
      durationSeconds: 1,
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      availableLiquid: 5,
      gravity: 9,
      condensationParameter: 2,
    }));
    expect(result.totalAtmosphericChange).toBe(0);
  });

  test('methane cycle uses constructor defaults', () => {
    const mc = new MethaneCycle({ gravity: 1.6, condensationParameter: 3 });
    mc.redistributePrecipitation = () => {};
    const tf = {
      temperature: { zones: { polar: {} } },
      zonalCoverageCache: { polar: { zoneArea: 1 } },
      calculateZoneSolarFlux: () => 0,
      zonalHydrocarbons: { polar: { liquid: 7 } },
      celestialParameters: { surfaceArea: 1 },
    };
    const spy = jest.spyOn(mc, 'processZone').mockReturnValue({ atmosphere: { methane: 0 }, methane: {} });
    const result = mc.runCycle(tf, ['polar'], {
      atmPressure: 0,
      vaporPressure: 0,
      available: 0,
      durationSeconds: 1,
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      availableLiquid: 7,
      gravity: 1.6,
      condensationParameter: 3,
    }));
    expect(result.totalAtmosphericChange).toBe(0);
  });

  test('co2 cycle uses constructor defaults', () => {
    const cc = new CO2Cycle({ condensationParameter: 4 });
    cc.redistributePrecipitation = () => {};
    const tf = {
      temperature: { zones: { temperate: {} } },
      zonalCoverageCache: { temperate: { zoneArea: 1 } },
      calculateZoneSolarFlux: () => 0,
      zonalSurface: { temperate: { dryIce: 2 } },
      celestialParameters: { surfaceArea: 1 },
    };
    const spy = jest.spyOn(cc, 'processZone').mockReturnValue({ atmosphere: { co2: 0 }, water: { dryIce: 0 }, potentialCO2Condensation: 0 });
    const result = cc.runCycle(tf, ['temperate'], {
      atmPressure: 0,
      vaporPressure: 0,
      available: 0,
      durationSeconds: 1,
    });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      availableDryIce: 2,
      condensationParameter: 4,
    }));
    expect(result.totalAtmosphericChange).toBe(0);
  });
});
