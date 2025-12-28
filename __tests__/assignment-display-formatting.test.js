const { describe, beforeEach, afterEach, test, expect } = global;

const { JSDOM } = require('jsdom');
const { formatNumber } = require('../src/js/numbers.js');

describe('Assignment displays use compact formatting', () => {
  let dom;

  beforeEach(() => {
    jest.resetModules();

    dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    global.formatNumber = formatNumber;

    global.resources = {
      special: { spaceships: { value: 0 } },
      colony: { androids: { value: 0 } },
    };
    global.projectManager = { projects: {}, getAssignedAndroids: () => 0 };
    global.projectElements = {};
    global.buildings = {};
    global.warpGateNetworkManager = {
      getCapSummaryText: () => '',
      getCapForProject: () => Infinity,
    };

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

      isBooleanFlagSet(flag) {
        return this.booleanFlags.has(flag);
      }
    };
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.formatNumber;
    delete global.resources;
    delete global.projectManager;
    delete global.projectElements;
    delete global.buildings;
    delete global.warpGateNetworkManager;
    delete global.Project;
  });

  test('SpaceshipProject assigned/available uses formatNumber', () => {
    const SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    const project = new SpaceshipProject({ attributes: { spaceMining: true } }, 'importMetal');
    project.assignedSpaceships = 1000;
    resources.special.spaceships.value = 1000;
    project.updateCostAndGains = () => {};
    project.updateAutoAssignUI = () => {};

    const container = document.createElement('div');
    project.createSpaceshipAssignmentUI(container);
    project.updateUI();

    expect(projectElements.importMetal.assignedSpaceshipsDisplay.textContent).toBe('1k');
    expect(projectElements.importMetal.availableSpaceshipsDisplay.textContent).toBe('1k');
  });

  test('AndroidProject assigned/available uses formatNumber', () => {
    const AndroidProject = require('../src/js/projects/AndroidProject.js');
    const project = new AndroidProject({ duration: 1000 }, 'androidAssist');
    project.booleanFlags.add('androidAssist');
    project.assignedAndroids = 1000;
    resources.colony.androids.value = 1000;

    const container = document.createElement('div');
    project.createAndroidAssignmentUI(container);
    project.updateUI();

    expect(projectElements.androidAssist.assignedAndroidsDisplay.textContent).toBe('1k');
    expect(projectElements.androidAssist.availableAndroidsDisplay.textContent).toBe('1k');
  });

  test('ImportResourcesProjectUI available uses formatNumber', () => {
    const ImportResourcesProjectUI = require('../src/js/projects/ImportResourcesProjectUI.js');
    const ui = new ImportResourcesProjectUI({
      getOrCreateCategoryContainer: () => document.body,
    });
    resources.special.spaceships.value = 1000;
    global.projectManager.projects = { oreSpaceMining: { assignmentMultiplier: 1 } };
    ui.ensureCard({ name: 'oreSpaceMining', category: 'resources' });
    ui.updateSharedDisplays({ name: 'oreSpaceMining' });
    expect(ui.availableDisplay.textContent).toBe('Available: 1k');
  });
});
