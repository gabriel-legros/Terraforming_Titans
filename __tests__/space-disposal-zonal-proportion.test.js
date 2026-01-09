const { describe, beforeEach, afterEach, test, expect } = global;

const { ZONES, getZonePercentage } = require('../src/js/terraforming/zones.js');

describe('Space disposal zonal distribution', () => {
  let originalProject;
  let originalTerraforming;
  let originalZones;
  let originalZonePercentage;

  beforeEach(() => {
    jest.resetModules();

    originalProject = global.Project;
    originalTerraforming = global.terraforming;
    originalZones = global.ZONES;
    originalZonePercentage = global.getZonePercentage;

    global.Project = class {
      constructor(config = {}, name = '') {
        this.name = name;
        this.attributes = config.attributes || {};
        this.duration = config.duration || 0;
        this.unlocked = true;
        this.isActive = false;
        this.isCompleted = false;
        this.isPaused = false;
        this.booleanFlags = new Set();
      }
    };

    global.ZONES = ZONES;
    global.getZonePercentage = getZonePercentage;

    global.terraforming = {
      zonalSurface: {
        tropical: { liquidWater: 100 },
        temperate: { liquidWater: 100 },
        polar: { liquidWater: 100 },
      },
    };
  });

  afterEach(() => {
    global.Project = originalProject;
    global.terraforming = originalTerraforming;
    global.ZONES = originalZones;
    global.getZonePercentage = originalZonePercentage;
  });

  test('removes surface disposal by zone percentage', () => {
    const SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    const project = new SpaceshipProject({ attributes: {} }, 'disposal-test');

    const amount = 90;
    const removed = project.removeZonalResource('surface', 'liquidWater', amount);
    expect(removed).toBeCloseTo(amount);

    const expectedTropical = 100 - amount * getZonePercentage('tropical');
    const expectedTemperate = 100 - amount * getZonePercentage('temperate');
    const expectedPolar = 100 - amount * getZonePercentage('polar');

    expect(terraforming.zonalSurface.tropical.liquidWater).toBeCloseTo(expectedTropical);
    expect(terraforming.zonalSurface.temperate.liquidWater).toBeCloseTo(expectedTemperate);
    expect(terraforming.zonalSurface.polar.liquidWater).toBeCloseTo(expectedPolar);
  });
});
