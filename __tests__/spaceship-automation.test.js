const { describe, beforeEach, test, expect } = global;

describe('SpaceshipAutomation assignments', () => {
  let SpaceshipAutomation;
  let automation;
  let projects;

  class StubProject {
    constructor(name) {
      this.name = name;
      this.displayName = name;
      this.assigned = 0;
    }

    getActiveShipCount() {
      return this.assigned;
    }

    isContinuous() {
      return this.assigned > 100;
    }

    applySpaceshipDelta(delta) {
      if (!delta) return 0;
      const available = Math.floor(resources.special.spaceships.value);
      if (delta > 0) {
        const take = Math.min(delta, available);
        this.assigned += take;
        resources.special.spaceships.value -= take;
        return take;
      }
      const give = Math.min(-delta, this.assigned);
      this.assigned -= give;
      resources.special.spaceships.value += give;
      return -give;
    }

    finalizeAssignmentChange() {}
  }

  beforeEach(() => {
    jest.resetModules();
    global.resources = { special: { spaceships: { value: 0 } } };
    global.projectManager = { projects: {} };
    global.projectElements = {};
    global.SpaceshipProject = StubProject;
    ({ SpaceshipAutomation } = require('../src/js/automation/spaceship-automation.js'));
    automation = new SpaceshipAutomation();
    global.automationManager = {
      enabled: true,
      hasFeature: () => true,
      spaceshipAutomation: automation
    };
    projects = {
      importMetal: new StubProject('importMetal'),
      exportMetal: new StubProject('exportMetal'),
      importCarbon: new StubProject('importCarbon')
    };
    projectManager.projects = projects;
  });

  test('distributes ships across steps and weights', () => {
    resources.special.spaceships.value = 30;
    automation.presets = [{
      id: 1,
      name: 'Test',
      enabled: true,
      steps: [
        {
          id: 101,
          limit: 10,
          entries: [
            { projectId: 'importMetal', weight: 1, max: null },
            { projectId: 'exportMetal', weight: 2, max: null }
          ]
        },
        {
          id: 102,
          limit: null,
          entries: [
            { projectId: 'importCarbon', weight: 1, max: null }
          ]
        }
      ]
    }];
    automation.activePresetId = 1;

    automation.applyAssignments();

    expect(projects.importMetal.assigned).toBe(4);
    expect(projects.exportMetal.assigned).toBe(6);
    expect(projects.importCarbon.assigned).toBe(20);
    expect(resources.special.spaceships.value).toBe(0);
  });

  test('respects disabled projects by leaving ships unassigned', () => {
    resources.special.spaceships.value = 15;
    automation.presets = [{
      id: 1,
      name: 'Test',
      enabled: true,
      steps: [
        {
          id: 101,
          limit: null,
          entries: [
            { projectId: 'importCarbon', weight: 1, max: null }
          ]
        }
      ]
    }];
    automation.activePresetId = 1;
    automation.toggleProjectDisabled('importCarbon', true);

    automation.applyAssignments();

    expect(projects.importCarbon.assigned).toBe(0);
    expect(resources.special.spaceships.value).toBe(15);
  });
});
