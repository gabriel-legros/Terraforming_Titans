const {
  simulateSurfaceWaterFlow,
  simulateSurfaceHydrocarbonFlow,
} = require('../src/js/terraforming/hydrology.js');

const { getZonePercentage } = require('../src/js/terraforming/zones.js');

function createTerraformingStub({ radiusKm = 3389.5, zonalWater, zonalHydrocarbons }) {
  const surfaceArea = 4 * Math.PI * Math.pow(radiusKm * 1000, 2);
  const zonalCoverageCache = {
    tropical: { ice: 1, hydrocarbonIce: 1 },
    temperate: { ice: 1, hydrocarbonIce: 1 },
    polar: { ice: 1, hydrocarbonIce: 1 },
  };

  return {
    celestialParameters: { radius: radiusKm, surfaceArea },
    zonalCoverageCache,
    zonalWater,
    zonalHydrocarbons,
  };
}

function createDepthZonalMap(depthsByZone = {}, key = 'liquid', radiusKm = 3389.5) {
  const surfaceArea = 4 * Math.PI * Math.pow(radiusKm * 1000, 2);
  const zones = ['tropical', 'temperate', 'polar'];
  const map = {};

  for (const zone of zones) {
    const zoneArea = surfaceArea * getZonePercentage(zone);
    const depth = depthsByZone[zone] || 0;
    map[zone] = { [key]: depth * zoneArea };
  }

  return map;
}

describe('hydrology surface flow', () => {
  describe('regular flow', () => {
    it('scales with sqrt(fluid elevation difference)', () => {
      const radiusKm = 3389.5;
      const liquidDepths = { tropical: 10, temperate: 10, polar: 0 };
      const zonalWater = {
        tropical: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).tropical.liquid, ice: 0, buriedIce: 0 },
        temperate: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).temperate.liquid, ice: 0, buriedIce: 0 },
        polar: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).polar.liquid, ice: 0, buriedIce: 0 },
      };

      const temps = { tropical: 260, temperate: 260, polar: 260 };
      const elevations1 = { tropical: -1, temperate: 0, polar: 100 };
      const elevations4 = { tropical: -4, temperate: 0, polar: 100 };

      const terraforming1 = createTerraformingStub({ radiusKm, zonalWater });
      const terraforming4 = createTerraformingStub({ radiusKm, zonalWater });

      const flow1 = simulateSurfaceWaterFlow(terraforming1, 86400, temps, elevations1);
      const flow4 = simulateSurfaceWaterFlow(terraforming4, 86400, temps, elevations4);

      const toTropical1 = flow1.changes.tropical.liquid;
      const toTropical4 = flow4.changes.tropical.liquid;

      expect(toTropical1).toBeGreaterThan(0);
      expect(toTropical4 / toTropical1).toBeCloseTo(2, 1);
    });

    it('scales with boundary length (tropics > poles)', () => {
      const radiusKm = 3389.5;
      const liquidDepths = { tropical: 10, temperate: 10, polar: 10 };
      const zonalWater = {
        tropical: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).tropical.liquid, ice: 0, buriedIce: 0 },
        temperate: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).temperate.liquid, ice: 0, buriedIce: 0 },
        polar: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).polar.liquid, ice: 0, buriedIce: 0 },
      };

      const temps = { tropical: 260, temperate: 260, polar: 260 };
      const elevations = { tropical: -1, temperate: 0, polar: -1 };
      const terraforming = createTerraformingStub({ radiusKm, zonalWater });
      const flow = simulateSurfaceWaterFlow(terraforming, 86400, temps, elevations);

      const toTropical = flow.changes.tropical.liquid;
      const toPolar = flow.changes.polar.liquid;

      const expectedRatio =
        Math.cos(23.5 * Math.PI / 180) / Math.cos(66.5 * Math.PI / 180);

      expect(toTropical).toBeGreaterThan(0);
      expect(toPolar).toBeGreaterThan(0);
      expect(toTropical / toPolar).toBeCloseTo(expectedRatio, 1);
    });
  });

  describe('flow melt (glacier contact)', () => {
    it('scales linearly with glacier height and temperature excess', () => {
      const radiusKm = 3389.5;
      const baseIceDepth = 10;
      const zonalWater = {
        tropical: { liquid: 0, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: createDepthZonalMap({ temperate: baseIceDepth }, 'ice', radiusKm).temperate.ice, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 },
      };

      const terraforming = createTerraformingStub({ radiusKm, zonalWater });
      const temps10 = { tropical: 273.15 + 10, temperate: 260, polar: 260 };
      const temps20 = { tropical: 273.15 + 20, temperate: 260, polar: 260 };

      const melt10 = simulateSurfaceWaterFlow(terraforming, 86400, temps10).totalMelt;
      const melt20 = simulateSurfaceWaterFlow(terraforming, 86400, temps20).totalMelt;

      const zonalWaterDoubleIce = {
        tropical: { liquid: 0, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: createDepthZonalMap({ temperate: baseIceDepth * 2 }, 'ice', radiusKm).temperate.ice, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 },
      };
      const terraformingDoubleIce = createTerraformingStub({ radiusKm, zonalWater: zonalWaterDoubleIce });
      const meltDoubleIce = simulateSurfaceWaterFlow(terraformingDoubleIce, 86400, temps10).totalMelt;

      expect(melt10).toBeGreaterThan(0);
      expect(melt20 / melt10).toBeCloseTo(2, 1);
      expect(meltDoubleIce / melt10).toBeCloseTo(2, 1);
    });

    it('does not depend on liquid viscosity (water vs methane)', () => {
      const radiusKm = 3389.5;
      const iceDepth = 10;
      const deltaT = 10;

      const zonalWater = {
        tropical: { liquid: 0, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: createDepthZonalMap({ temperate: iceDepth }, 'ice', radiusKm).temperate.ice, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 },
      };

      const zonalHydrocarbons = {
        tropical: { liquid: 0, ice: 0 },
        temperate: { liquid: 0, ice: createDepthZonalMap({ temperate: iceDepth }, 'ice', radiusKm).temperate.ice },
        polar: { liquid: 0, ice: 0 },
      };

      const terraforming = createTerraformingStub({ radiusKm, zonalWater, zonalHydrocarbons });
      const tempsWater = { tropical: 273.15 + deltaT, temperate: 260, polar: 260 };
      const tempsMethane = { tropical: 90.7 + deltaT, temperate: 80, polar: 80 };

      const waterMelt = simulateSurfaceWaterFlow(terraforming, 86400, tempsWater).totalMelt;
      const methaneMelt = simulateSurfaceHydrocarbonFlow(terraforming, 86400, tempsMethane).totalMelt;

      expect(waterMelt).toBeGreaterThan(0);
      expect(methaneMelt).toBeGreaterThan(0);
      expect(methaneMelt / waterMelt).toBeCloseTo(1, 2);
    });
  });

  describe('ice blocks regular flow', () => {
    it('requires source liquid surface above target liquid+ice surface', () => {
      const radiusKm = 3389.5;
      const surfaceArea = 4 * Math.PI * Math.pow(radiusKm * 1000, 2);
      const temperateArea = surfaceArea * getZonePercentage('temperate');

      const zonalWater = {
        tropical: { liquid: createDepthZonalMap({ tropical: 2 }, 'liquid', radiusKm).tropical.liquid, ice: 0, buriedIce: 0 },
        temperate: { liquid: createDepthZonalMap({ temperate: 1 }, 'liquid', radiusKm).temperate.liquid, ice: 10 * temperateArea, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 },
      };

      const temps = { tropical: 260, temperate: 260, polar: 260 };
      const elevations = { tropical: 0, temperate: 0, polar: 0 };
      const terraforming = createTerraformingStub({ radiusKm, zonalWater });

      const flowBlocked = simulateSurfaceWaterFlow(terraforming, 86400, temps, elevations);
      expect(flowBlocked.changes.tropical.liquid).toBe(0);
      expect(flowBlocked.changes.temperate.liquid).toBeLessThanOrEqual(0);

      const zonalWaterUnblocked = {
        tropical: { liquid: createDepthZonalMap({ tropical: 20 }, 'liquid', radiusKm).tropical.liquid, ice: 0, buriedIce: 0 },
        temperate: { liquid: createDepthZonalMap({ temperate: 1 }, 'liquid', radiusKm).temperate.liquid, ice: 10 * temperateArea, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 },
      };
      const terraformingUnblocked = createTerraformingStub({ radiusKm, zonalWater: zonalWaterUnblocked });
      const flowUnblocked = simulateSurfaceWaterFlow(terraformingUnblocked, 86400, temps, elevations);

      expect(flowUnblocked.changes.temperate.liquid).toBeGreaterThan(0);
    });
  });

  describe('freeze-out', () => {
    it('freezes liquid that flows into a sub-freezing zone', () => {
      const radiusKm = 3389.5;
      const liquidDepths = { tropical: 10, temperate: 0, polar: 0 };
      const zonalWater = {
        tropical: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).tropical.liquid, ice: 0, buriedIce: 0 },
        temperate: { liquid: 0, ice: 0, buriedIce: 0 },
        polar: { liquid: 0, ice: 0, buriedIce: 0 },
      };

      const temps = { tropical: 280, temperate: 260, polar: 260 };
      const elevations = { tropical: 0, temperate: -100, polar: 100 };
      const terraforming = createTerraformingStub({ radiusKm, zonalWater });

      const flow = simulateSurfaceWaterFlow(terraforming, 86400, temps, elevations);

      expect(flow.changes.tropical.liquid).toBeLessThan(0);
      expect(flow.changes.temperate.ice).toBeGreaterThan(0);
      expect(flow.changes.temperate.liquid).toBe(0);
      expect(flow.changes.tropical.liquid + flow.changes.temperate.ice).toBeCloseTo(0, 8);
      expect(flow.totalFreezeOut).toBeGreaterThan(0);
    });

    it('also applies to surface hydrocarbons', () => {
      const radiusKm = 3389.5;
      const liquidDepths = { tropical: 10, temperate: 0, polar: 0 };
      const zonalHydrocarbons = {
        tropical: { liquid: createDepthZonalMap(liquidDepths, 'liquid', radiusKm).tropical.liquid, ice: 0 },
        temperate: { liquid: 0, ice: 0 },
        polar: { liquid: 0, ice: 0 },
      };

      const temps = { tropical: 100, temperate: 80, polar: 80 };
      const elevations = { tropical: 0, temperate: -100, polar: 100 };
      const terraforming = createTerraformingStub({ radiusKm, zonalHydrocarbons });

      const flow = simulateSurfaceHydrocarbonFlow(terraforming, 86400, temps, elevations);

      expect(flow.changes.tropical.liquid).toBeLessThan(0);
      expect(flow.changes.temperate.ice).toBeGreaterThan(0);
      expect(flow.changes.temperate.liquid).toBe(0);
      expect(flow.changes.tropical.liquid + flow.changes.temperate.ice).toBeCloseTo(0, 8);
      expect(flow.totalFreezeOut).toBeGreaterThan(0);
    });
  });
});
