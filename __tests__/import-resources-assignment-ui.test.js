const { describe, beforeEach, afterEach, test, expect } = global;

const { JSDOM } = require('jsdom');
const { formatNumber } = require('../src/js/numbers.js');

describe('Import Resources assignment UI', () => {
  let dom;

  beforeEach(() => {
    jest.resetModules();

    dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    global.formatNumber = formatNumber;
    global.resources = { special: { spaceships: { value: 0 } } };
    global.projectElements = {};
    global.projectManager = { projects: {} };

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
    };
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.formatNumber;
    delete global.resources;
    delete global.projectElements;
    delete global.projectManager;
    delete global.Project;
  });

  test('clicking 0 clears auto-assign on import projects', () => {
    const SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    const ImportResourcesProjectUI = require('../src/js/projects/ImportResourcesProjectUI.js');

    const categoryContainer = document.createElement('div');
    document.body.appendChild(categoryContainer);

    const ui = new ImportResourcesProjectUI({
      getProjectElements: () => projectElements,
      getOrCreateCategoryContainer: () => categoryContainer,
      updateProjectUI: () => {},
    });

    const makeProject = (name) => new SpaceshipProject({ attributes: { spaceMining: true } }, name);
    const projects = {
      oreSpaceMining: makeProject('oreSpaceMining'),
      siliconSpaceMining: makeProject('siliconSpaceMining'),
      carbonSpaceMining: makeProject('carbonSpaceMining'),
      waterSpaceMining: makeProject('waterSpaceMining'),
      nitrogenSpaceMining: makeProject('nitrogenSpaceMining'),
      hydrogenSpaceMining: makeProject('hydrogenSpaceMining'),
    };
    projectManager.projects = projects;

    projects.oreSpaceMining.assignedSpaceships = 5;
    projects.oreSpaceMining.autoAssignSpaceships = true;

    ui.createRow(projects.oreSpaceMining);
    const row = ui.getRow('oreSpaceMining');
    const zeroButton = Array.from(row.mainRow.querySelectorAll('button')).find(
      (button) => button.textContent === '0'
    );

    expect(projectElements.oreSpaceMining.autoAssignCheckbox.checked).toBe(true);
    zeroButton.click();

    expect(projects.oreSpaceMining.assignedSpaceships).toBe(0);
    expect(projects.oreSpaceMining.autoAssignSpaceships).toBe(false);
    expect(projectElements.oreSpaceMining.autoAssignCheckbox.checked).toBe(false);
  });
});

