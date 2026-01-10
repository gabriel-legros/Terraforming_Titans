const path = require('path');

const { KesslerHazard } = require(path.join('..', 'src/js/terraforming/hazards/kesslerHazard.js'));

describe('Kessler hazard', () => {
  beforeEach(() => {
    global.ZONES = ['tropical', 'temperate', 'polar'];
    global.getZonePercentage = () => 1 / global.ZONES.length;
  });

  test('initializes orbital debris from land', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 0,
          initialValue: 0,
          unlocked: false,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    hazard.initializeResources(
      { initialLand: 100 },
      { orbitalDebrisPerLand: 100 },
      { unlockOnly: false }
    );

    expect(global.resources.special.orbitalDebris.unlocked).toBe(true);
    expect(global.resources.special.orbitalDebris.value).toBe(10000);
    expect(global.resources.special.orbitalDebris.initialValue).toBe(10000);
  });

  test('caps solis resources and diverts water to the surface', () => {
    global.resources = {
      colony: {
        water: {
          value: 5000,
          activeEffects: [{ effectId: 'solisStorage-water' }],
          updateStorageCap: jest.fn()
        },
        metal: { value: 5000 },
        research: { value: 5000 },
        food: { value: 5000 },
        components: { value: 2000 },
        electronics: { value: 1500 },
        glass: { value: 1200 },
        androids: { value: 1300 }
      },
      surface: {
        liquidWater: {
          value: 0,
          unlocked: false
        }
      }
    };

    const terraforming = {
      zonalSurface: {
        tropical: { liquidWater: 0 },
        temperate: { liquidWater: 0 },
        polar: { liquidWater: 0 }
      },
      synchronizeGlobalResources: () => {
        const totalWater = terraforming.zonalSurface.tropical.liquidWater
          + terraforming.zonalSurface.temperate.liquidWater
          + terraforming.zonalSurface.polar.liquidWater;
        global.resources.surface.liquidWater.value = totalWater;
      },
      _updateZonalCoverageCache: () => {}
    };

    const hazard = new KesslerHazard(null);
    hazard.applySolisTravelAdjustments(terraforming);

    expect(global.resources.colony.water.value).toBe(1000);
    expect(global.resources.colony.water.activeEffects).toHaveLength(0);
    expect(global.resources.colony.water.updateStorageCap).toHaveBeenCalled();
    expect(global.resources.surface.liquidWater.value).toBeCloseTo(4000, 6);
    expect(global.resources.surface.liquidWater.unlocked).toBe(true);
    expect(global.resources.colony.food.value).toBe(1000);
    expect(global.resources.colony.components.value).toBe(1000);
    expect(global.resources.colony.electronics.value).toBe(1000);
    expect(global.resources.colony.glass.value).toBe(1000);
    expect(global.resources.colony.androids.value).toBe(1000);
    expect(global.resources.colony.metal.value).toBe(5000);
    expect(global.resources.colony.research.value).toBe(5000);
  });

  test('clears permanently once debris reaches zero', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 0,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    expect(hazard.isCleared()).toBe(true);
    global.resources.special.orbitalDebris.value = 50;
    expect(hazard.isCleared()).toBe(true);
  });

  test('computes project failure chances from debris density', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 100,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    const initialChances = hazard.getProjectFailureChances();
    expect(initialChances.smallFailure).toBeCloseTo(0.5, 6);
    expect(initialChances.largeFailure).toBeCloseTo(0.05, 6);

    global.resources.special.orbitalDebris.value = 0;
    const clearedChances = hazard.getProjectFailureChances();
    expect(clearedChances.smallFailure).toBeCloseTo(0, 6);
    expect(clearedChances.largeFailure).toBeCloseTo(0, 6);
  });

  test('decays debris below the exobase faster than above', () => {
    global.resources = {
      special: {
        orbitalDebris: {
          value: 100,
          initialValue: 100,
          unlocked: true,
          modifyRate: jest.fn()
        }
      }
    };

    const hazard = new KesslerHazard(null);
    hazard.periapsisDistribution = [
      { periapsisMeters: 50000, massTons: 40 },
      { periapsisMeters: 200000, massTons: 60 }
    ];

    const terraforming = { exosphereHeightMeters: 150000 };
    hazard.update(1000, terraforming, { orbitalDebrisPerLand: 100 });

    expect(global.resources.special.orbitalDebris.value).toBeLessThan(100);
    const summary = hazard.getDecaySummary();
    expect(summary.exobaseHeightMeters).toBe(150000);
    expect(summary.belowFraction).toBeGreaterThan(0);
    expect(summary.decayTonsPerSecond).toBeGreaterThan(0);
  });
});
