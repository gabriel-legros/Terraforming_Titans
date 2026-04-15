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
      this.relevant = options.relevant !== false;
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
  setGlobal('projectManager', {
    projects: projectObjects,
    isProjectRelevantToCurrentPlanet(project) {
      return project.relevant !== false;
    }
  }, originalGlobals);
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
    expect(projects.waterMining.getAutomationShipCount()).toBe(15);
    expect(resources.special.spaceships.value).toBe(455);
    cleanup();
  });

  it('cappedMin stops a ship-only step when one equal-weight target caps first', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      projects: {
        metalMining: {},
        siliconMining: {},
        waterMining: {},
      },
    });
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 10, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'waterMining', weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(10);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(10);
    expect(projects.waterMining.getAutomationShipCount()).toBe(10);
    expect(resources.special.spaceships.value).toBe(70);
    cleanup();
  });

  it('cappedMin preserves weighted ship-only ratios until the smallest weighted cap is reached', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      projects: {
        metalMining: {},
        siliconMining: {},
        waterMining: {},
      },
    });
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 2, max: 30, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'waterMining', weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(30);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(15);
    expect(projects.waterMining.getAutomationShipCount()).toBe(15);
    expect(resources.special.spaceships.value).toBe(40);
    cleanup();
  });

  it('cappedMin can stop on unassigned ships as the smallest equal-weight cap', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      projects: {
        metalMining: {},
        siliconMining: {},
      },
    });
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'unassignedShips', weight: 1, max: 10, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(10);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(10);
    expect(resources.special.spaceships.value).toBe(80);
    cleanup();
  });

  it('cappedMin respects project caps even when entry max is larger', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      projects: {
        metalMining: { maxAssignableShips: 12 },
        siliconMining: {},
        waterMining: {},
      },
    });
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'waterMining', weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(12);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(12);
    expect(projects.waterMining.getAutomationShipCount()).toBe(12);
    expect(resources.special.spaceships.value).toBe(64);
    cleanup();
  });

  it('cappedMin uses remaining headroom when a project is already near its cap', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 92,
      projects: {
        metalMining: { assignedSpaceships: 8 },
        siliconMining: {},
        waterMining: {},
      },
    });
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 10, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'waterMining', weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(10);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(10);
    expect(projects.waterMining.getAutomationShipCount()).toBe(10);
    expect(resources.special.spaceships.value).toBe(70);
    cleanup();
  });

  it('cappedMin carries exact leftovers into later steps', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      projects: {
        metalMining: {},
        siliconMining: {},
        waterMining: {},
      },
    });

    automation.presets = [{
      id: 1,
      name: 'Default',
      enabled: true,
      steps: [
        {
          id: 1,
          mode: 'cappedMin',
          limit: null,
          entries: [
            { projectId: 'metalMining', weight: 1, max: 10, maxMode: 'absolute' },
            { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
            { projectId: 'unassignedShips', weight: 1, max: 10, maxMode: 'absolute' },
          ],
        },
        {
          id: 2,
          mode: 'fixed',
          limit: 30,
          entries: [
            { projectId: 'waterMining', weight: 1, max: null, maxMode: 'absolute' },
          ],
        },
      ],
    }];
    automation.activePresetId = 1;

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(10);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(10);
    expect(projects.waterMining.getAutomationShipCount()).toBe(30);
    expect(resources.special.spaceships.value).toBe(50);
    cleanup();
  });

  it('cappedMin ignores zero-weight ship-only targets when computing the stop point', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      projects: {
        metalMining: {},
        siliconMining: {},
        waterMining: {},
      },
    });
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 10, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'waterMining', weight: 0, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(10);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(10);
    expect(projects.waterMining.getAutomationShipCount()).toBe(0);
    expect(resources.special.spaceships.value).toBe(80);
    cleanup();
  });

  it('allocates 100 ships and 10 mass drivers across metal, silicon, and disposal at smallest cap using separate pools', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      massDriverCount: 10,
      projects: {
        metalMining: { maxAssignableShips: 100 },
        siliconMining: { maxAssignableShips: 100 },
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(50);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(50);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(5);
    expect(resources.special.spaceships.value).toBe(0);
    cleanup();
  });

  it('cappedMin stops a mixed step when metal reaches a cap of 10', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      massDriverCount: 10,
      projects: {
        metalMining: { maxAssignableShips: 100 },
        siliconMining: { maxAssignableShips: 100 },
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 10, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(10);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(10);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(1);
    expect(resources.special.spaceships.value).toBe(80);
    cleanup();
  });

  it('cappedMin mixed steps stop on a constrained mass-driver pool', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      massDriverCount: 2,
      projects: {
        metalMining: {},
        siliconMining: {},
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(20);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(20);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(2);
    expect(resources.special.spaceships.value).toBe(60);
    cleanup();
  });

  it('cappedMin ignores the disposal target when mass drivers are disabled', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      massDriverCount: 10,
      projects: {
        disposeResources: { type: 'disposal', massDriverEnabled: false },
        metalMining: {},
        siliconMining: {},
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMin',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(50);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(50);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(0);
    expect(resources.special.spaceships.value).toBe(0);
    cleanup();
  });

  it('allocates 100 ships and 10 mass drivers across metal, silicon, and disposal at largest cap using separate pools', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 100,
      massDriverCount: 10,
      projects: {
        metalMining: { maxAssignableShips: 100 },
        siliconMining: { maxAssignableShips: 100 },
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMax',
      entries: [
        { projectId: 'metalMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: 'siliconMining', weight: 1, max: 100, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: 100, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.metalMining.getAutomationShipCount()).toBe(50);
    expect(projects.siliconMining.getAutomationShipCount()).toBe(50);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(5);
    expect(resources.special.spaceships.value).toBe(0);
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

  it('splits weighted mixed target with 10M ships and 500k mass drivers into 7.5M mining + 2.5M disposal ships + all mass drivers', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 10000000,
      massDriverCount: 500000,
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

    expect(projects.metalMining.getAutomationShipCount()).toBe(7500000);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(2500000);
    expect(buildings.massDriver.active).toBe(500000);
    expect(resources.special.spaceships.value).toBe(0);
    cleanup();
  });

  it('handles 10M ships + 1M mass drivers with equal weights in a mixed step', () => {
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

  it('caps mixed-step mass-driver contribution at ship parity: 10M ships + 10M mass drivers, equal weights', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 10000000,
      massDriverCount: 10000000,
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

  it('keeps one-third ships unassigned when hydrogen is disabled but still present in mixed weighted entries', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 500000,
      massDriverCount: 120000,
      projects: {
        oreSpaceMining: {},
        siliconSpaceMining: {},
        hydrogenSpaceMining: { enabled: false },
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMax',
      entries: [
        { projectId: massDriverTargetId, weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'oreSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'siliconSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'unassignedShips', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'hydrogenSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.oreSpaceMining.getAutomationShipCount()).toBeGreaterThanOrEqual(166666);
    expect(projects.oreSpaceMining.getAutomationShipCount()).toBeLessThanOrEqual(166667);
    expect(projects.siliconSpaceMining.getAutomationShipCount()).toBeGreaterThanOrEqual(166666);
    expect(projects.siliconSpaceMining.getAutomationShipCount()).toBeLessThanOrEqual(166667);
    expect(projects.hydrogenSpaceMining.getAutomationShipCount()).toBe(0);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBeGreaterThanOrEqual(16666);
    expect(buildings.massDriver.active).toBeLessThanOrEqual(16667);
    expect(resources.special.spaceships.value).toBeGreaterThanOrEqual(166666);
    expect(resources.special.spaceships.value).toBeLessThanOrEqual(166667);
    cleanup();
  });

  it('keeps one-third ship-only allocation with disposal weight 10 and three weight-1 ship targets', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 500000,
      massDriverCount: 1000000,
      projects: {
        oreSpaceMining: {},
        siliconSpaceMining: {},
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMax',
      entries: [
        { projectId: massDriverTargetId, weight: 10, max: null, maxMode: 'absolute' },
        { projectId: 'oreSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'siliconSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'unassignedShips', weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    const lower = 166666;
    const upper = 166667;
    const metalShips = projects.oreSpaceMining.getAutomationShipCount();
    const silicaShips = projects.siliconSpaceMining.getAutomationShipCount();
    const unassignedShips = resources.special.spaceships.value;

    expect(metalShips).toBeGreaterThanOrEqual(lower);
    expect(metalShips).toBeLessThanOrEqual(upper);
    expect(silicaShips).toBeGreaterThanOrEqual(lower);
    expect(silicaShips).toBeLessThanOrEqual(upper);
    expect(unassignedShips).toBeGreaterThanOrEqual(lower);
    expect(unassignedShips).toBeLessThanOrEqual(upper);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    cleanup();
  });

  it('splits 500k ships across metal, ice, silica, and unassigned with disposal weight 1 and activates 12.5k mass drivers', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 500000,
      massDriverCount: 100000,
      projects: {
        oreSpaceMining: {},
        waterSpaceMining: {},
        siliconSpaceMining: {},
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'cappedMax',
      entries: [
        { projectId: 'oreSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'waterSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'siliconSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'unassignedShips', weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    expect(projects.oreSpaceMining.getAutomationShipCount()).toBe(125000);
    expect(projects.waterSpaceMining.getAutomationShipCount()).toBe(125000);
    expect(projects.siliconSpaceMining.getAutomationShipCount()).toBe(125000);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBe(12500);
    expect(resources.special.spaceships.value).toBe(125000);
    cleanup();
  });

  it('keeps one-third ships unassigned in fixed assign-amount mixed steps with mass drivers', () => {
    const { automation, projects, cleanup } = createHarness({
      initialShips: 500000,
      massDriverCount: 100000,
      projects: {
        oreSpaceMining: {},
        siliconSpaceMining: {},
      },
    });
    const massDriverTargetId = automation.getMassDriverAutomationId();
    configurePreset(automation, {
      mode: 'fixed',
      limit: 1000000000000,
      entries: [
        { projectId: 'oreSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: massDriverTargetId, weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'siliconSpaceMining', weight: 1, max: null, maxMode: 'absolute' },
        { projectId: 'unassignedShips', weight: 1, max: null, maxMode: 'absolute' },
      ],
    });

    automation.applyAssignments();

    const lower = 166666;
    const upper = 166667;
    expect(projects.oreSpaceMining.getAutomationShipCount()).toBeGreaterThanOrEqual(lower);
    expect(projects.oreSpaceMining.getAutomationShipCount()).toBeLessThanOrEqual(upper);
    expect(projects.siliconSpaceMining.getAutomationShipCount()).toBeGreaterThanOrEqual(lower);
    expect(projects.siliconSpaceMining.getAutomationShipCount()).toBeLessThanOrEqual(upper);
    expect(resources.special.spaceships.value).toBeGreaterThanOrEqual(lower);
    expect(resources.special.spaceships.value).toBeLessThanOrEqual(upper);
    expect(projects.disposeResources.getAutomationShipCount()).toBe(0);
    expect(buildings.massDriver.active).toBeGreaterThanOrEqual(16666);
    expect(buildings.massDriver.active).toBeLessThanOrEqual(16667);
    cleanup();
  });

  it('keeps previously seen project targets in the automation dropdown after travel away', () => {
    const { automation, projects, cleanup } = createHarness({
      projects: {
        moltenRoute: { relevant: false },
      },
    });

    expect(automation.getAutomationTargets().map(target => target.name)).not.toContain('moltenRoute');

    projects.moltenRoute.relevant = true;
    automation.recordCurrentlyAvailableTargets();
    expect(automation.getAutomationTargets().map(target => target.name)).toContain('moltenRoute');

    projects.moltenRoute.relevant = false;
    expect(automation.hasSeenProjectTarget('moltenRoute')).toBe(true);
    expect(automation.getAutomationTargets().map(target => target.name)).toContain('moltenRoute');
    cleanup();
  });
});
