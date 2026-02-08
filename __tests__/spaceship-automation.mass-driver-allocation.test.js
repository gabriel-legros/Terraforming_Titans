const { SpaceshipAutomation } = require('../src/js/automation/spaceship-automation.js');

function setGlobal(name, value, original) {
  if (!(name in original)) {
    original[name] = global[name];
  }
  global[name] = value;
}

describe('Spaceship automation mass-driver weighting', () => {
  let originalGlobals;

  beforeEach(() => {
    originalGlobals = {};

    class MockSpaceshipProject {
      static refreshAutoAssignDisplays() {}

      constructor(name) {
        this.name = name;
        this.displayName = name;
        this.enabled = true;
        this.unlocked = true;
        this.autoAssignSpaceships = false;
        this.assignedSpaceships = 0;
      }

      isVisible() {
        return true;
      }

      isPermanentlyDisabled() {
        return false;
      }

      isAutomationManuallyDisabled() {
        return false;
      }

      shouldAutomationDisable() {
        return false;
      }

      isContinuous() {
        return this.assignedSpaceships > 100;
      }

      getMaxAssignableShips() {
        return Infinity;
      }

      getActiveShipCount() {
        return this.assignedSpaceships;
      }

      getAutomationShipCount() {
        return this.assignedSpaceships;
      }

      applySpaceshipDelta(delta) {
        if (!delta) return 0;
        let applied = delta;
        if (delta > 0) {
          const available = Math.floor(resources.special.spaceships.value);
          applied = Math.min(delta, available);
        } else {
          applied = -Math.min(-delta, this.assignedSpaceships);
        }
        this.assignedSpaceships += applied;
        resources.special.spaceships.value -= applied;
        return applied;
      }

      finalizeAssignmentChange() {}
    }

    class MockDisposalProject extends MockSpaceshipProject {
      constructor(name) {
        super(name);
        this.massDriverShipEquivalency = 10;
      }

      isBooleanFlagSet(flagId) {
        return flagId === 'massDriverEnabled';
      }

      getMassDriverStructure() {
        return buildings.massDriver;
      }

      setMassDriverActive(target) {
        const max = this.getMassDriverStructure().count;
        this.getMassDriverStructure().active = Math.max(0, Math.min(target, max));
      }
    }

    const miningProject = new MockSpaceshipProject('metalMining');
    const disposalProject = new MockDisposalProject('disposeResources');

    setGlobal('SpaceshipProject', MockSpaceshipProject, originalGlobals);
    setGlobal('resources', {
      special: { spaceships: { value: 10000000 } },
      colony: { colonists: { value: 0 }, workers: { cap: 0 } },
    }, originalGlobals);
    setGlobal('buildings', {
      massDriver: { count: 1000000, active: 0, autoActiveEnabled: false },
    }, originalGlobals);
    setGlobal('projectManager', {
      projects: {
        metalMining: miningProject,
        disposeResources: disposalProject,
      },
    }, originalGlobals);
    setGlobal('automationManager', {
      enabled: true,
      hasFeature: () => true,
    }, originalGlobals);
  });

  afterEach(() => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  });

  it('assigns all ships to mining and mass drivers to disposal in mixed weighted step', () => {
    const automation = new SpaceshipAutomation();
    const massDriverTargetId = automation.getMassDriverAutomationId();

    automation.presets = [{
      id: 1,
      name: 'Default',
      enabled: true,
      steps: [{
        id: 1,
        mode: 'cappedMax',
        limit: null,
        entries: [
          { projectId: 'metalMining', weight: 1, max: null, maxMode: 'absolute' },
          { projectId: massDriverTargetId, weight: 1, max: null, maxMode: 'absolute' },
        ],
      }],
    }];
    automation.activePresetId = 1;

    automation.applyAssignments();

    expect(projectManager.projects.metalMining.getAutomationShipCount()).toBe(10000000);
    expect(projectManager.projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(1000000);
    expect(resources.special.spaceships.value).toBe(0);
  });
});
