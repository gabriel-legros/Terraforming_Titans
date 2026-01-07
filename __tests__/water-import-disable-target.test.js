const zones = require('../src/js/terraforming/zones.js');

describe('Water import automation mode', () => {
  class StubSpaceshipProject {
    constructor(config, name) {
      this.attributes = config.attributes || {};
      this.name = name;
    }

    isBooleanFlagSet() {
      return true;
    }
  }

  let SpaceMiningProject;

  beforeEach(() => {
    jest.resetModules();
    global.SpaceshipProject = StubSpaceshipProject;
    global.projectElements = {};
    global.ZONES = zones.ZONES;
    global.getZonePercentage = zones.getZonePercentage;
    global.estimateAmountForCoverage = zones.estimateAmountForCoverage;
    global.calculateAverageCoverage = jest.fn().mockReturnValue(0);
    global.terraforming = {
      waterTarget: 0.2,
      celestialParameters: { surfaceArea: 1000 },
      zonalSurface: {
        tropical: { liquidWater: 0, ice: 0 },
        temperate: { liquidWater: 0, ice: 0 },
        polar: { liquidWater: 0, ice: 0 }
      }
    };
    SpaceMiningProject = require('../src/js/projects/SpaceMiningProject.js');
  });

  test('disables imports when water+ice exceeds the target amount', () => {
    const project = new SpaceMiningProject({ attributes: { dynamicWaterImport: true } }, 'waterSpaceMining');
    project.disableAboveWaterCoverage = true;
    project.waterCoverageDisableMode = 'target';

    const targetAmount = zones.ZONES.reduce((total, zone) => {
      const zoneArea = terraforming.celestialParameters.surfaceArea * zones.getZonePercentage(zone);
      return total + zones.estimateAmountForCoverage(terraforming.waterTarget, zoneArea);
    }, 0);
    const perZone = (targetAmount * 1.1) / zones.ZONES.length;
    zones.ZONES.forEach(zone => {
      terraforming.zonalSurface[zone].liquidWater = perZone;
      terraforming.zonalSurface[zone].ice = 0;
    });

    expect(project.exceedsWaterCoverageLimit(true)).toBe(true);

    const belowTarget = (targetAmount * 0.5) / zones.ZONES.length;
    zones.ZONES.forEach(zone => {
      terraforming.zonalSurface[zone].liquidWater = belowTarget;
    });

    expect(project.exceedsWaterCoverageLimit(true)).toBe(false);
  });
});
