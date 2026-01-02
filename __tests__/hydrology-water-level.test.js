describe('hydrology surface flow water level', () => {
  test('uses cached liquid coverage to compute water level and drive flow', () => {
    const priorZones = global.ZONES;
    const priorGetZonePercentage = global.getZonePercentage;
    global.ZONES = ['tropical', 'temperate', 'polar'];
    global.getZonePercentage = () => 1 / 3;

    const { simulateSurfaceWaterFlow } = require('../src/js/terraforming/hydrology.js');

    const terraforming = {
      celestialParameters: { surfaceArea: 300, radius: 3389.5 },
      zonalSurface: {
        tropical: { liquidWater: 100, ice: 0, buriedIce: 0 },
        temperate: { liquidWater: 100, ice: 0, buriedIce: 0 },
        polar: { liquidWater: 100, ice: 0, buriedIce: 0 },
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
    expect(Math.abs(flowWithCoverage.changes.tropical.liquidWater)).toBeLessThan(1e-12);
    expect(Math.abs(flowWithCoverage.changes.temperate.liquidWater)).toBeLessThan(1e-12);
    expect(Math.abs(flowWithCoverage.changes.polar.liquidWater)).toBeLessThan(1e-12);

    const net =
      flowWithCoverage.changes.tropical.liquidWater +
      flowWithCoverage.changes.temperate.liquidWater +
      flowWithCoverage.changes.polar.liquidWater;
    expect(Math.abs(net)).toBeLessThan(1e-12);

    terraforming.zonalCoverageCache.tropical.liquidWater = 1;

    const flowWithoutCoverageSkew = simulateSurfaceWaterFlow(terraforming, 3600, temps, elevations);
    expect(Math.abs(flowWithoutCoverageSkew.changes.tropical.liquidWater)).toBeLessThan(1e-12);
    expect(Math.abs(flowWithoutCoverageSkew.changes.temperate.liquidWater)).toBeLessThan(1e-12);
    expect(Math.abs(flowWithoutCoverageSkew.changes.polar.liquidWater)).toBeLessThan(1e-12);

    global.ZONES = priorZones;
    global.getZonePercentage = priorGetZonePercentage;
  });

  test('flow melt becomes gas when liquid is forbidden by pressure', () => {
    const priorZones = global.ZONES;
    const priorGetZonePercentage = global.getZonePercentage;
    global.ZONES = ['tropical', 'temperate', 'polar'];
    global.getZonePercentage = () => 1 / 3;

    const { simulateSurfaceWaterFlow } = require('../src/js/terraforming/hydrology.js');
    const { boilingPointWater } = require('../src/js/terraforming/water-cycle.js');

    const terraforming = {
      celestialParameters: { surfaceArea: 300, radius: 3389.5 },
      atmosphericPressureCache: { totalPressure: 100 },
      zonalSurface: {
        tropical: { liquidWater: 0, ice: 0, buriedIce: 0 },
        temperate: { liquidWater: 0, ice: 0, buriedIce: 0 },
        polar: { liquidWater: 0, ice: 200, buriedIce: 0 },
      },
      zonalCoverageCache: {
        tropical: { zoneArea: 100, liquidWater: 0, ice: 0 },
        temperate: { zoneArea: 100, liquidWater: 0, ice: 0 },
        polar: { zoneArea: 100, liquidWater: 0, ice: 1 },
      },
    };

    const temps = { tropical: 260, temperate: 280, polar: 260 };
    const elevations = { tropical: 0, temperate: 0, polar: 0 };

    const flow = simulateSurfaceWaterFlow(terraforming, 3600, temps, elevations, {
      triplePressure: 611,
      disallowLiquidBelowTriple: true,
      boilingPointFn: boilingPointWater,
    });

    expect(flow.totalGasMelt).toBeGreaterThan(0);
    expect(Math.abs(flow.totalMelt)).toBeLessThan(1e-9);
    expect(Math.abs(flow.changes.temperate.liquidWater)).toBeLessThan(1e-9);

    global.ZONES = priorZones;
    global.getZonePercentage = priorGetZonePercentage;
  });
});
