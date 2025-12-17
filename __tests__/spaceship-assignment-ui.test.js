const { describe, beforeEach, afterEach, test, expect } = global;

const { JSDOM } = require('jsdom');
const { formatNumber } = require('../src/js/numbers.js');

describe('SpaceshipProject assignment UI', () => {
  let dom;

  beforeEach(() => {
    jest.resetModules();

    dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    global.formatNumber = formatNumber;

    global.resources = {
      special: { spaceships: { value: 0 } },
      colony: {},
    };
    global.projectManager = { projects: {} };
    global.projectElements = {};
    global.buildings = {};

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

      saveState() {
        return {};
      }

      loadState() {}
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
    delete global.Project;
  });

  test('clicking 0 clears auto-assign', () => {
    const SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    const project = new SpaceshipProject({ attributes: { spaceMining: true } }, 'importMetal');
    project.updateCostAndGains = () => {};

    project.assignedSpaceships = 5;
    project.autoAssignSpaceships = true;
    resources.special.spaceships.value = 0;

    const container = document.createElement('div');
    project.createSpaceshipAssignmentUI(container);

    const zeroButton = Array.from(container.getElementsByTagName('button')).find(
      button => button.textContent === '0'
    );
    expect(zeroButton).toBeTruthy();

    zeroButton.click();

    expect(project.assignedSpaceships).toBe(0);
    expect(project.autoAssignSpaceships).toBe(false);
    expect(projectElements.importMetal.autoAssignCheckbox.checked).toBe(false);
  });
});

