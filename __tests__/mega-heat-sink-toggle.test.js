describe('MegaHeatSinkProject cooling toggle', () => {
  let MegaHeatSinkProject;
  let project;

  const createProject = () => new MegaHeatSinkProject({
    name: 'Mega Heat Sink',
    category: 'mega',
    cost: {},
    duration: 1000,
    description: '',
    repeatable: true,
    unlocked: true,
    attributes: {
      workersPerCompletion: 1
    }
  }, 'megaHeatSink');

  beforeEach(() => {
    jest.resetModules();
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.resources = { colony: { workers: { cap: 100 } } };
    global.EffectableEntity = require('../src/js/effectable-entity');
    global.Project = require('../src/js/projects.js').Project;
    const { createToggleButton, setToggleButtonState } = require('../src/js/ui-utils.js');
    global.createToggleButton = createToggleButton;
    global.setToggleButtonState = setToggleButtonState;
    global.updateProjectUI = jest.fn(() => {
      if (project) {
        project.updateUI();
      }
    });
    global.formatNumber = (value) => value;
    MegaHeatSinkProject = require('../src/js/projects/MegaHeatSinkProject.js');
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.resources;
    delete global.EffectableEntity;
    delete global.Project;
    delete global.createToggleButton;
    delete global.setToggleButtonState;
    delete global.updateProjectUI;
    delete global.formatNumber;
    project = null;
    jest.resetModules();
  });

  test('toggle updates active state and display', () => {
    const container = document.createElement('div');
    project = createProject();
    project.calculateCoolingPerSecond = () => 1;
    project.renderUI(container);

    const { coolingToggle, coolingValue } = project.summaryElements;

    expect(project.heatSinksActive).toBe(true);
    expect(coolingValue.textContent).toContain('K/s');

    coolingToggle.click();

    expect(project.heatSinksActive).toBe(false);
    expect(coolingValue.textContent).toBe('Off');

    coolingToggle.click();

    expect(project.heatSinksActive).toBe(true);
    expect(coolingValue.textContent).toContain('K/s');
  });
});
