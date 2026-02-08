const { SpaceshipAutomation } = require('../src/js/automation/spaceship-automation.js');

function setGlobal(name, value, original) {
  if (!(name in original)) {
    original[name] = global[name];
  }
  global[name] = value;
}

function createHarness({
  initialShips = 0,
  massDriverCount = 0,
  massDriverActive = 0,
  massDriverEquivalency = 10,
  projects = {},
} = {}) {
  const originalGlobals = {};

  class MockSpaceshipProject {
    static refreshAutoAssignDisplays() {}

    constructor(name, options = {}) {
      this.name = name;
      this.displayName = name;
      this.enabled = options.enabled !== false;
      this.unlocked = options.unlocked !== false;
      this.autoAssignSpaceships = false;
      this.assignedSpaceships = options.assignedSpaceships || 0;
      this.maxAssignableShips = options.maxAssignableShips ?? Infinity;
      this.automationDisabled = !!options.automationDisabled;
      this.manualDisabled = !!options.manualDisabled;
      this.visible = options.visible !== false;
      this.permanentlyDisabled = !!options.permanentlyDisabled;
    }

    isVisible() {
      return this.visible;
    }

    isPermanentlyDisabled() {
      return this.permanentlyDisabled;
    }

    isAutomationManuallyDisabled() {
      return this.manualDisabled;
    }

    shouldAutomationDisable() {
      return this.automationDisabled;
    }

    isContinuous() {
      return this.assignedSpaceships > 100;
    }

    getMaxAssignableShips() {
      return this.maxAssignableShips;
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
    constructor(name, options = {}) {
      super(name, options);
      this.massDriverShipEquivalency = options.massDriverShipEquivalency ?? massDriverEquivalency;
      this.massDriverEnabled = options.massDriverEnabled !== false;
    }

    isBooleanFlagSet(flagId) {
      return flagId === 'massDriverEnabled' ? this.massDriverEnabled : false;
    }

    getMassDriverStructure() {
      return buildings.massDriver;
    }

    setMassDriverActive(target) {
      const max = this.getMassDriverStructure().count;
      this.getMassDriverStructure().active = Math.max(0, Math.min(target, max));
    }
  }

  const projectObjects = {};
  const projectConfig = {
    disposeResources: { type: 'disposal' },
    ...projects,
  };
  Object.keys(projectConfig).forEach((name) => {
    const config = projectConfig[name] || {};
    if (config.type === 'disposal' || name === 'disposeResources') {
      projectObjects[name] = new MockDisposalProject(name, config);
      return;
    }
    projectObjects[name] = new MockSpaceshipProject(name, config);
  });

  setGlobal('SpaceshipProject', MockSpaceshipProject, originalGlobals);
  setGlobal('resources', {
    special: { spaceships: { value: initialShips } },
    colony: { colonists: { value: 0 }, workers: { cap: 0 } },
  }, originalGlobals);
  setGlobal('buildings', {
    massDriver: { count: massDriverCount, active: massDriverActive, autoActiveEnabled: false },
  }, originalGlobals);
  setGlobal('projectManager', { projects: projectObjects }, originalGlobals);
  setGlobal('automationManager', {
    enabled: true,
    hasFeature: () => true,
  }, originalGlobals);

  const automation = new SpaceshipAutomation();

  const cleanup = () => {
    Object.keys(originalGlobals).forEach((name) => {
      if (originalGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = originalGlobals[name];
      }
    });
  };

  return { automation, projects: projectObjects, cleanup };
}

function configurePreset(automation, {
  mode = 'cappedMax',
  limit = null,
  entries = [],
  enabled = true,
} = {}) {
  automation.presets = [{
    id: 1,
    name: 'Default',
    enabled,
    steps: [{
      id: 1,
      mode,
      limit,
      entries,
    }],
  }];
  automation.activePresetId = 1;
}

describe('Spaceship automation scenarios', () => {
  it('splits 10M ships to mining and 1M mass drivers to disposal in mixed weighted step', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 10000000,
      massDriverCount: 1000000,
      projects: {
        metalMining: {},
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMax',
      entries: [
        { projectId: 'metalMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(10000000);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(1000000);
    expect(resources.special.spaceships.value).toBe(0);
    cleanup();
  });

  it('does not let mass-driver capacity inflate ship weighting in mixed steps', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      massDriverCount: 1000,
      projects: {
        metalMining: {},
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    projects.disposeResources.automationDisabled = true;
    automation.disabledProjects.add(massDriverTargetId);
    configurePreset(automation, {
      mode: 'cappedMax',
      entries: [
        { projectId: 'metalMining', weight: 50, max: null, maxMode: 'absolute' },
        { projectId: 'unassignedShips', weight: 50, max: null, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(50);
    expect(resources.special.spaceships.value).toBe(50);
    expect(buildings.massDriver.active).toBe(0);
    cleanup();
  });

  it('release if disabled false keeps current assignment on disabled project', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 0,
      projects: {
        metalMining: { assignedSpaceships: 120, automationDisabled: true },
      },
    });
    configurePreset(automation, {
      mode: 'fixed',
      limit: 120,
      entries: [
        { projectId: 'metalMining', weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(120);
    expect(resources.special.spaceships.value).toBe(0);
    cleanup();
  });

  it('release if disabled true releases ships from disabled project', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 0,
      projects: {
        metalMining: { assignedSpaceships: 120, automationDisabled: true },
      },
    });
    automation.disabledProjects.add('metalMining');
    configurePreset(automation, {
      mode: 'fixed',
      limit: 120,
      entries: [
        { projectId: 'metalMining', weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(0);
    expect(resources.special.spaceships.value).toBe(120);
    cleanup();
  });

  it('cappedMin stops when the smallest weighted max is reached', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 500,
      projects: {
        metalMining: {},
        waterMining: {},
      },
    });
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 2, max: 30, maxMode: 'absolute' },
        { projectId: 'waterMining', weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(30);
    expect(projects.waterMining.getAutomationShipCount()).toBe(16);
    expect(resources.special.spaceships.value).toBe(454);
    cleanup();
  });

  it('mass-driver-only step can use both ship and mass-driver pools', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      massDriverCount: 10,
      projects: {},
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'fixed',
      limit: 200,
      entries: [
        { projectId: massDriverTargetId, weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.disposeResources.getAutomationShipCount()).toBe(100);
    expect(buildings.massDriver.active).toBe(10);
    expect(resources.special.spaceships.value).toBe(0);
    cleanup();
  });

  it('handles a 3-step allocation plan with deterministic carryover between steps', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 1000,
      projects: {
        metalMining: {},
        waterMining: {},
        gasMining: {},
      },
    });

    automation.presets = [{
      id: 1,
      name: 'Default',
      enabled: true,
      steps: [
        {
          id: 1,
          mode: 'fixed',
          limit: 300,
          entries: [
            { projectId: 'metalMining', weight: 1, max: null, maxMode: 'absolute' },
            { projectId: 'waterMining', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
        {
          id: 2,
          mode: 'fixed',
          limit: 400,
          entries: [
            { projectId: 'gasMining', weight: 1, max: null, maxMode: 'absolute' },
            { projectId: 'unassignedShips', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
        {
          id: 3,
          mode: 'fixed',
          limit: 300,
          entries: [
            { projectId: 'metalMining', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
      ],
    }];
    automation.activePresetId = 1;

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(450);
    expect(projects.waterMining.getAutomationShipCount()).toBe(150);
    expect(projects.gasMining.getAutomationShipCount()).toBe(200);
    expect(resources.special.spaceships.value).toBe(200);
    cleanup();
  });

  it('handles a 4-step plan with max caps and preserves leftover ships as unassigned', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 2000,
      projects: {
        metalMining: { maxAssignableShips: 600 },
        waterMining: { maxAssignableShips: 500 },
        gasMining: { maxAssignableShips: 300 },
      },
    });

    automation.presets = [{
      id: 1,
      name: 'Default',
      enabled: true,
      steps: [
        {
          id: 1,
          mode: 'fixed',
          limit: 800,
          entries: [
            { projectId: 'metalMining', weight: 3, max: null, maxMode: 'absolute' },
            { projectId: 'waterMining', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
        {
          id: 2,
          mode: 'fixed',
          limit: 700,
          entries: [
            { projectId: 'gasMining', weight: 1, max: null, maxMode: 'absolute' },
            { projectId: 'waterMining', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
        {
          id: 3,
          mode: 'fixed',
          limit: 200,
          entries: [
            { projectId: 'unassignedShips', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
        {
          id: 4,
          mode: 'fixed',
          limit: 600,
          entries: [
            { projectId: 'metalMining', weight: 1, max: null, maxMode: 'absolute' },
            { projectId: 'unassignedShips', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
      ],
    }];
    automation.activePresetId = 1;

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(600);
    expect(projects.waterMining.getAutomationShipCount()).toBe(500);
    expect(projects.gasMining.getAutomationShipCount()).toBe(300);
    expect(resources.special.spaceships.value).toBe(600);
    cleanup();
  });
});
