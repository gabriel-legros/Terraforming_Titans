const path = require('path');

function setGlobal(name, value, originalGlobals) {
  originalGlobals[name] = global[name];
  global[name] = value;
}

function createHarness() {
  jest.resetModules();
  const originalGlobals = {};

  class MockSpaceExportBaseProject {}

  setGlobal('SpaceExportBaseProject', MockSpaceExportBaseProject, originalGlobals);
  setGlobal('resources', {
    atmospheric: {
      oxygen: { value: 20000 },
    },
  }, originalGlobals);
  setGlobal('terraforming', {
    celestialParameters: {
      gravity: 1,
      radius: 1,
      surfaceArea: 1,
    },
  }, originalGlobals);
  setGlobal('calculateAtmosphericPressure', amount => amount, originalGlobals);
  setGlobal('lifeManager', {
    estimateAtmosphericIdealNeed: () => ({}),
    estimateAtmosphericConsumption: () => ({}),
  }, originalGlobals);

  const SpaceDisposalProject = require(path.resolve(
    __dirname,
    '../src/js/projects/SpaceDisposalProject.js'
  ));
  const project = Object.create(SpaceDisposalProject.prototype);

  const cleanup = () => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  };

  return { project, cleanup };
}

function createOxygenTarget() {
  return {
    id: 2,
    selectedDisposalResource: {
      category: 'atmospheric',
      resource: 'oxygen',
    },
    autoStart: true,
    disableBelowTemperature: false,
    disableBelowPressure: true,
    disablePressureThreshold: 20,
    disableBelowCoverage: false,
  };
}

describe('Resource Disposal active-target grace', () => {
  it('runs against same-tick atmospheric production at the pressure floor', () => {
    const { project, cleanup } = createHarness();
    const target = createOxygenTarget();
    project.disposalTargets = [target];
    project.isBooleanFlagSet = flagId => flagId === 'atmosphericMonitoring';
    project.getDisposalGroupData = () => ({
      resourceMetaLookup: {
        'atmospheric:oxygen': { phaseType: 'gas' },
      },
    });
    project.getEffectiveAvailableAmount = (category, resource, accumulatedChanges) => (
      resources[category][resource].value + (accumulatedChanges?.[category]?.[resource] || 0)
    );
    project.getShipCapacity = () => 100;

    expect(project.getRunnableTargets()).toEqual([]);
    expect(project.getRunnableTargets({ atmospheric: { oxygen: 100 } })).toEqual([target]);

    cleanup();
  });

  it('reserves actual net life consumption instead of ideal demand for atmospheric gas disposal', () => {
    const { project, cleanup } = createHarness();
    const target = createOxygenTarget();
    const accumulatedChanges = { atmospheric: { oxygen: 500 } };
    project.isBooleanFlagSet = flagId => flagId === 'atmosphericMonitoring';
    project.getDisposalGroupData = () => ({
      resourceMetaLookup: {
        'atmospheric:oxygen': { phaseType: 'gas' },
      },
    });
    lifeManager.estimateAtmosphericIdealNeed = jest.fn(() => ({ oxygen: 250 }));
    lifeManager.estimateAtmosphericConsumption = (deltaTime, changes) => {
      expect(deltaTime).toBe(1000);
      expect(changes).toBe(accumulatedChanges);
      return { oxygen: 100 };
    };

    const disposed = project.getTargetClampedDisposalAmount(
      target,
      1000,
      'atmospheric',
      'oxygen',
      20500,
      1000,
      accumulatedChanges
    );

    expect(disposed).toBe(401);
    expect(20500 - disposed - 100).toBe(19999);
    expect(lifeManager.estimateAtmosphericIdealNeed).not.toHaveBeenCalled();

    cleanup();
  });

  it('reserves life need for atmospheric gases without a pressure floor', () => {
    const { project, cleanup } = createHarness();
    const target = createOxygenTarget();
    target.disableBelowPressure = false;
    project.isBooleanFlagSet = flagId => flagId === 'atmosphericMonitoring';
    project.getDisposalGroupData = () => ({
      resourceMetaLookup: {
        'atmospheric:oxygen': { phaseType: 'gas' },
      },
    });
    lifeManager.estimateAtmosphericIdealNeed = jest.fn(() => ({ oxygen: 250 }));
    lifeManager.estimateAtmosphericConsumption = () => ({ oxygen: 100 });

    const disposed = project.getTargetClampedDisposalAmount(
      target,
      1000,
      'atmospheric',
      'oxygen',
      500,
      1000
    );

    expect(disposed).toBe(401);
    expect(500 - disposed).toBe(99);
    expect(lifeManager.estimateAtmosphericIdealNeed).not.toHaveBeenCalled();

    cleanup();
  });

  it('reserves prior energy only while an auto-start disposal operation is active', () => {
    const { project, cleanup } = createHarness();
    project.lastDisposalEnergyDemand = 500;
    project.getDisposalConstrainedContinuousDemand = () => ({ cost: {} });
    project.hasAnyAutoStartTarget = () => true;
    project.isActive = true;

    expect(project.estimateProductivityCostAndGain(1000).cost.colony.energy).toBe(500);

    project.isActive = false;
    expect(project.estimateProductivityCostAndGain(1000).cost).toEqual({});

    project.isActive = true;
    project.hasAnyAutoStartTarget = () => false;
    expect(project.estimateProductivityCostAndGain(1000).cost).toEqual({});

    cleanup();
  });

  it('shows a target that disposed resources during the last tick as active', () => {
    const { project, cleanup } = createHarness();
    const target = createOxygenTarget();
    project.disposalTargets = [target];
    project.isActive = true;
    project.lastActiveDisposalTargetIds = [];
    project.getRunnableTargets = () => [];
    project.getDisposalConstrainedContinuousDemand = () => ({ cost: {} });

    project.applyContinuousPlan({
      context: null,
      hasContinuousWork: false,
      disposalEntries: [{ targetId: target.id, appliedAmount: 100 }],
    });

    const displayTargets = project.getDisposalTargetsForDisplay();
    expect(displayTargets).toEqual([target]);
    expect(project.getTargetStatusText(target, displayTargets)).toBe('Active');

    cleanup();
  });
});
