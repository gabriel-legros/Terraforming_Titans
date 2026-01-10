const path = require('path');

const { KesslerHazard } = require(path.join('..', 'src/js/terraforming/hazards/kesslerHazard.js'));

describe('Kessler hazard', () => {
  beforeEach(() => {
    global.ZONES = ['tropical', 'temperate', 'polar'];
    global.getZonePercentage = () => 1 / global.ZONES.length;
  });

  test('initializes orbital debris from land', () => {
    global.resources = {
      surface: {
        orbitalDebris: {
          value: 0,
          initialValue: 0,
          unlocked: false
        }
      }
    };

    const hazard = new KesslerHazard(null);
    hazard.initializeResources(
      { initialLand: 100 },
      { orbitalDebrisPerLand: 100 },
      { unlockOnly: false }
    );

    expect(global.resources.surface.orbitalDebris.unlocked).toBe(true);
    expect(global.resources.surface.orbitalDebris.value).toBe(10000);
    expect(global.resources.surface.orbitalDebris.initialValue).toBe(10000);
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
      surface: {
        orbitalDebris: {
          value: 0,
          initialValue: 100,
          unlocked: true
        }
      }
    };

    const hazard = new KesslerHazard(null);
    expect(hazard.isCleared()).toBe(true);
    global.resources.surface.orbitalDebris.value = 50;
    expect(hazard.isCleared()).toBe(true);
  });
});
