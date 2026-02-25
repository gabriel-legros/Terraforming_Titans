const path = require('path');

function setGlobal(name, value, original) {
  if (!(name in original)) {
    original[name] = global[name];
  }
  global[name] = value;
}

function setupGlobals() {
  const originalGlobals = {};

  class MockSpaceshipProject {
    constructor(config, name) {
      this.attributes = config.attributes || {};
      this.name = name;
      this.flags = {};
      this.selectedDisposalResource = this.attributes.defaultDisposal || null;
    }

    isBooleanFlagSet(flagId) {
      return this.flags[flagId] === true;
    }
  }

  setGlobal('SpaceshipProject', MockSpaceshipProject, originalGlobals);
  setGlobal('projectElements', {}, originalGlobals);
  setGlobal('calculateAtmosphericPressure', (amount) => amount, originalGlobals);
  setGlobal('resources', {
    atmospheric: {
      oxygen: { value: 10000 },
    },
  }, originalGlobals);
  setGlobal('buildings', {
    storageDepot: {
      storage: {},
    },
  }, originalGlobals);
  setGlobal('terraforming', {
    celestialParameters: {
      gravity: 1,
      radius: 1,
    },
  }, originalGlobals);

  return () => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  };
}

describe('SpaceExportBaseProject disposal limits without rendered UI', () => {
  it('applies atmospheric pressure limits even when projectElements are missing', () => {
    const cleanup = setupGlobals();
    const SpaceExportBaseProject = require(path.resolve(__dirname, '../src/js/projects/SpaceExportBaseProject.js'));
    const project = new SpaceExportBaseProject({
      attributes: {
        defaultDisposal: { category: 'atmospheric', resource: 'oxygen' },
      },
    }, 'testDisposal');

    project.flags.atmosphericMonitoring = true;
    project.disableBelowPressure = true;
    project.disablePressureThreshold = 20;
    project.selectedDisposalResource = { category: 'atmospheric', resource: 'oxygen' };

    expect(project.shouldShowPressureControl()).toBe(true);
    expect(project.getDisposalLowerLimitFloorAmount('atmospheric', 'oxygen', 50000)).toBe(20000);
    expect(project.shouldAutomationDisable()).toBe(true);

    cleanup();
  });

  it('does not let UI metadata override disposal phase logic', () => {
    const cleanup = setupGlobals();
    const SpaceExportBaseProject = require(path.resolve(__dirname, '../src/js/projects/SpaceExportBaseProject.js'));
    const project = new SpaceExportBaseProject({
      attributes: {
        disposable: {
          atmospheric: ['oxygen'],
        },
        defaultDisposal: { category: 'atmospheric', resource: 'oxygen' },
      },
    }, 'testDisposal');

    project.flags.atmosphericMonitoring = true;
    project.disableBelowPressure = true;
    project.disablePressureThreshold = 20;
    project.selectedDisposalResource = { category: 'atmospheric', resource: 'oxygen' };

    projectElements[project.name] = {
      disposalResourceMetaLookup: {
        'atmospheric:oxygen': { phaseType: null },
      },
    };

    expect(project.shouldShowPressureControl()).toBe(true);
    expect(project.shouldAutomationDisable()).toBe(true);

    cleanup();
  });
});
