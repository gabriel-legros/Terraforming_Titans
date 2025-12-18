describe('hydrology surface flow water level', () => {
  test('uses cached liquid coverage to compute water level and drive flow', () => {
    const priorZones = global.ZONES;
    const priorGetZonePercentage = global.getZonePercentage;
    global.ZONES = ['tropical', 'temperate', 'polar'];
    global.getZonePercentage = () => 1 / 3;

    const { simulateSurfaceWaterFlow } = require('../src/js/terraforming/hydrology.js');

    const terraforming = {
      celestialParameters: { surfaceArea: 300, radius: 3389.5 },
      zonalWater: {
        tropical: { liquid: 100, ice: 0, buriedIce: 0 },
        temperate: { liquid: 100, ice: 0, buriedIce: 0 },
        polar: { liquid: 100, ice: 0, buriedIce: 0 },
      },
      zonalCoverageCache: {
        tropical: { zoneArea: 100, liquidWater: 0.1, ice: 0 },
        temperate: { zoneArea: 100, liquidWater: 1, ice: 0 },
        polar: { zoneArea: 100, liquidWater: 1, ice: 0 },
      },
    };

    const temps = { tropical: 300, temperate: 300, polar: 300 };
    const elevations = { tropical: 0, temperate: 0, polar: 0 };

    const flowWithCoverage = simulateSurfaceWaterFlow(terraforming, 3600, temps, elevations);
    expect(flowWithCoverage.changes.tropical.liquid).toBeLessThan(0);
    expect(Math.abs(flowWithCoverage.changes.tropical.liquid)).toBeGreaterThan(1e-6);
    expect(flowWithCoverage.changes.temperate.liquid + flowWithCoverage.changes.polar.liquid).toBeGreaterThan(0);

    const net =
      flowWithCoverage.changes.tropical.liquid +
      flowWithCoverage.changes.temperate.liquid +
      flowWithCoverage.changes.polar.liquid;
    expect(Math.abs(net)).toBeLessThan(1e-9);

    terraforming.zonalCoverageCache.tropical.liquidWater = 1;

    const flowWithoutCoverageSkew = simulateSurfaceWaterFlow(terraforming, 3600, temps, elevations);
    expect(Math.abs(flowWithoutCoverageSkew.changes.tropical.liquid)).toBeLessThan(1e-12);
    expect(Math.abs(flowWithoutCoverageSkew.changes.temperate.liquid)).toBeLessThan(1e-12);
    expect(Math.abs(flowWithoutCoverageSkew.changes.polar.liquid)).toBeLessThan(1e-12);

    global.ZONES = priorZones;
    global.getZonePercentage = priorGetZonePercentage;
  });
});
