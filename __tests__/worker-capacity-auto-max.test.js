describe('WorkerCapacityBatchProject auto max', () => {
  let WorkerCapacityBatchProject;
  let project;

  const createProject = () => new WorkerCapacityBatchProject({
    name: 'Worker Capacity Test',
    category: 'mega',
    cost: {},
    duration: 1000,
    description: '',
    repeatable: true,
    unlocked: true,
    attributes: {}
  }, 'workerCapacityTest');

  beforeEach(() => {
    jest.resetModules();
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.resources = { colony: { workers: { cap: 100 } } };
    global.EffectableEntity = require('../src/js/effectable-entity');
    global.Project = require('../src/js/projects.js').Project;
    WorkerCapacityBatchProject = require('../src/js/projects/WorkerCapacityBatchProject.js');
    global.updateProjectUI = jest.fn(() => {
      if (project) {
        project.updateUI();
      }
    });
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.resources;
    delete global.EffectableEntity;
    delete global.Project;
    delete global.updateProjectUI;
    project = null;
    jest.resetModules();
  });

  test('manual amount buttons disable auto max', () => {
    const container = document.createElement('div');
    project = createProject();
    project.renderWorkerCapacityControls(container);
    project.updateUI();

    const buttons = [
      project.workerCapacityUI.bMin,
      project.workerCapacityUI.bMinus,
      project.workerCapacityUI.bPlus,
      project.workerCapacityUI.bMax
    ];

    buttons.forEach((button) => {
      project.autoMax = true;
      project.updateUI();
      button.click();
      expect(project.autoMax).toBe(false);
      expect(project.workerCapacityUI.autoMaxCheckbox.checked).toBe(false);
    });
  });
});
