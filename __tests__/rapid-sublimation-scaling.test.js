const ResourceCycle = require('../src/js/terraforming/resource-cycle.js');

class TestCycle extends ResourceCycle {
  condensationRateFactor() {
    return { liquidRate: 0, iceRate: 0 };
  }

  evaporationRate() {
    return 0;
  }

  sublimationRate() {
    return 0;
  }
}

describe('rapid sublimation blending', () => {
  it('splits forbidden melt into liquid vs rapid sublimation over 1 Pa', () => {
    const freezePoint = 273.15;
    const triplePressure = 600;
    const cycle = new TestCycle({
      freezePoint,
      sublimationPoint: freezePoint,
      triplePressure,
      disallowLiquidBelowTriple: true,
      coverageKeys: { liquid: 'liquidCoverage', ice: 'iceCoverage' },
    });
    cycle.surfaceBucket = 'water';
    cycle.atmosphereKey = 'testAtm';

    const params = {
      zoneArea: 1000,
      zoneTemperature: freezePoint + 0.5,
      durationSeconds: 1,
      atmPressure: triplePressure + 1,
      vaporPressure: 0,
      availableLiquid: 0,
      availableIce: 1,
      availableBuriedIce: 0,
      liquidCoverage: 0,
      iceCoverage: 1,
    };

    const allowed = cycle.processZone(params);
    const forbidden = cycle.processZone({ ...params, atmPressure: triplePressure - 0.5 });

    expect(allowed.meltAmount).toBeGreaterThan(0);
    expect(allowed.rapidSublimationAmount).toBe(0);

    expect(forbidden.meltAmount).toBeCloseTo(allowed.meltAmount * 0.5, 10);
    expect(forbidden.rapidSublimationAmount).toBeCloseTo(allowed.meltAmount * 0.5, 10);
    expect(forbidden.atmosphere.testAtm).toBeCloseTo(forbidden.rapidSublimationAmount, 10);
    expect(forbidden.water.liquid).toBeCloseTo(forbidden.meltAmount, 10);
  });

  it('routes all forbidden melt to rapid sublimation above the 1 K blend range', () => {
    const freezePoint = 273.15;
    const triplePressure = 600;
    const cycle = new TestCycle({
      freezePoint,
      sublimationPoint: freezePoint,
      triplePressure,
      disallowLiquidBelowTriple: true,
      coverageKeys: { liquid: 'liquidCoverage', ice: 'iceCoverage' },
    });
    cycle.surfaceBucket = 'water';
    cycle.atmosphereKey = 'testAtm';

    const params = {
      zoneArea: 1000,
      zoneTemperature: freezePoint + 2,
      durationSeconds: 1,
      atmPressure: 700,
      vaporPressure: 0,
      availableLiquid: 0,
      availableIce: 1,
      availableBuriedIce: 0,
      liquidCoverage: 0,
      iceCoverage: 1,
    };

    const allowed = cycle.processZone(params);
    const forbidden = cycle.processZone({ ...params, atmPressure: triplePressure - 1 });

    expect(allowed.meltAmount).toBeGreaterThan(0);
    expect(forbidden.meltAmount).toBe(0);
    expect(forbidden.rapidSublimationAmount).toBeCloseTo(allowed.meltAmount, 10);
  });
});
