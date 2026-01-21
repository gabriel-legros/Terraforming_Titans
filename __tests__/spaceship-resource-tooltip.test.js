const { describe, beforeEach, afterEach, test, expect } = global;

const { JSDOM } = require('jsdom');
const { formatNumber } = require('../src/js/numbers.js');

describe('Spaceship resource tooltip', () => {
  let dom;
  let updateSpaceshipAssignments;

  beforeEach(() => {
    jest.resetModules();

    dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    global.formatNumber = formatNumber;
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

    global.resources = {
      special: { spaceships: { value: 12.9 } },
      colony: {},
    };
    global.projectManager = { projects: {} };

    global.SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
    updateSpaceshipAssignments = require('../src/js/resourceUI.js').updateSpaceshipAssignments;
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.formatNumber;
    delete global.resources;
    delete global.projectManager;
    delete global.Project;
    delete global.SpaceshipProject;
  });

  test('lists total and per-project assignments', () => {
    const mining = new global.SpaceshipProject({ attributes: { spaceMining: true } }, 'importMetal');
    mining.displayName = 'Metal Mining';
    mining.assignedSpaceships = 30;
    const exportProject = new global.SpaceshipProject({ attributes: { spaceMining: true } }, 'export');
    exportProject.displayName = 'Export';
    exportProject.assignedSpaceships = 5;
    projectManager.projects = { importMetal: mining, export: exportProject };

    const assignmentsDiv = document.createElement('div');
    updateSpaceshipAssignments(assignmentsDiv);

    const text = assignmentsDiv.textContent;
    expect(text).toContain('Total');
    expect(text).toContain(formatNumber(47, true));
    expect(text).toContain('Unassigned');
    expect(text).toContain(formatNumber(12, true));
    expect(text).toContain('Metal Mining');
    expect(text).toContain(formatNumber(30, true));
    expect(text).toContain('Export');
    expect(text).toContain(formatNumber(5, true));
  });
});
