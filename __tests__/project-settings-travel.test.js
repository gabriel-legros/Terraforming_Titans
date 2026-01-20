describe('Project setting travel preservation', () => {
  class StubSpaceshipProject {
    constructor(config, name) {
      this.attributes = config.attributes || {};
      this.name = name;
    }

    saveState() {
      return {};
    }

    loadState() {}
  }

  let SpaceMiningProject;
  let SpaceExportBaseProject;

  beforeEach(() => {
    jest.resetModules();
    global.gameSettings = { preserveProjectSettingsOnTravel: true };
    global.SpaceshipProject = StubSpaceshipProject;
    global.projectElements = {};
    SpaceMiningProject = require('../src/js/projects/SpaceMiningProject.js');
    SpaceExportBaseProject = require('../src/js/projects/SpaceExportBaseProject.js');
  });

  afterEach(() => {
    delete global.gameSettings;
    delete global.SpaceshipProject;
    delete global.projectElements;
    jest.resetModules();
  });

  it('keeps import project disable thresholds when enabled', () => {
    const project = new SpaceMiningProject({ attributes: {} }, 'oreSpaceMining');
    project.disableAbovePressure = true;
    project.disablePressureThreshold = 15;
    project.disableAboveOxygenPressure = true;
    project.disableOxygenPressureThreshold = 4;
    project.disableAboveWaterCoverage = true;
    project.waterCoverageThreshold = 0.35;
    project.waterCoverageDisableMode = 'target';
    project.pressureUnit = 'Pa';
    project.oxygenPressureUnit = 'Pa';

    const travelState = project.saveTravelState();

    const afterTravel = new SpaceMiningProject({ attributes: {} }, 'oreSpaceMining');
    afterTravel.loadTravelState(travelState);

    expect(afterTravel.disableAbovePressure).toBe(true);
    expect(afterTravel.disablePressureThreshold).toBe(15);
    expect(afterTravel.disableAboveOxygenPressure).toBe(true);
    expect(afterTravel.disableOxygenPressureThreshold).toBe(4);
    expect(afterTravel.disableAboveWaterCoverage).toBe(true);
    expect(afterTravel.waterCoverageThreshold).toBe(0.35);
    expect(afterTravel.waterCoverageDisableMode).toBe('target');
    expect(afterTravel.pressureUnit).toBe('Pa');
    expect(afterTravel.oxygenPressureUnit).toBe('Pa');
  });

  it('keeps resource disposal selections when enabled', () => {
    const project = new SpaceExportBaseProject({ attributes: {} }, 'spaceDisposal');
    project.selectedDisposalResource = { category: 'surface', resource: 'ice' };
    project.disableBelowTemperature = true;
    project.disableTemperatureThreshold = 240;
    project.disableBelowPressure = true;
    project.disablePressureThreshold = 12.5;
    project.pressureUnit = 'Pa';

    const travelState = project.saveTravelState();

    const afterTravel = new SpaceExportBaseProject({ attributes: {} }, 'spaceDisposal');
    afterTravel.loadTravelState(travelState);

    expect(afterTravel.selectedDisposalResource).toEqual({ category: 'surface', resource: 'ice' });
    expect(afterTravel.disableBelowTemperature).toBe(true);
    expect(afterTravel.disableTemperatureThreshold).toBe(240);
    expect(afterTravel.disableBelowPressure).toBe(true);
    expect(afterTravel.disablePressureThreshold).toBe(12.5);
    expect(afterTravel.pressureUnit).toBe('Pa');
  });
});
