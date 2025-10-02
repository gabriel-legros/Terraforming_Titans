const ResourceCycle = require('../src/js/terraforming/resource-cycle.js');

describe('applyZonalChanges', () => {
  test('runCycle updates zonal stores', () => {
    class DummyCycle extends ResourceCycle {
      constructor() {
        super();
        this.zonalKey = 'zonalWater';
        this.surfaceBucket = 'water';
        this.atmosphereKey = 'foo';
      }
      processZone() {
        return { atmosphere: { foo: 0 }, water: { liquid: 1 } };
      }
      finalizeAtmosphere({}) {
        return { totalAtmosphericChange: 0, totalsByProcess: {} };
      }
    }
    const dc = new DummyCycle();
    const tf = {
      temperature: { zones: { tropical: {} } },
      zonalCoverageCache: { tropical: { zoneArea: 1 } },
      calculateZoneSolarFlux: () => 0,
      zonalWater: { tropical: { liquid: 0 } },
      celestialParameters: { surfaceArea: 1 },
    };
    const totals = dc.runCycle(tf, ['tropical'], { atmPressure: 0, vaporPressure: 0, available: 0, durationSeconds: 1 });
    expect(tf.zonalWater.tropical.liquid).toBe(1);
    expect(totals.totalAtmosphericChange).toBe(0);
  });
});
