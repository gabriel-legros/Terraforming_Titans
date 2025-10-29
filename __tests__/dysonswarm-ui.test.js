const { JSDOM } = require('jsdom');

describe('Dyson Swarm travel reset UI', () => {
  let renderDysonSwarmUI;
  let updateDysonSwarmUI;
  const originalProjectElements = global.projectElements;
  const originalFormatNumber = global.formatNumber;
  const originalResources = global.resources;
  const originalWindow = global.window;
  const originalDocument = global.document;

  const setUpDom = () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
  };

  beforeEach(() => {
    jest.resetModules();
    setUpDom();
    global.projectElements = {};
    global.formatNumber = () => '1';
    global.resources = {
      colony: {
        metal: { displayName: 'Metal' },
        electronics: { displayName: 'Electronics' },
        components: { displayName: 'Components' },
        glass: { displayName: 'Glass' },
      },
    };

    ({ renderDysonSwarmUI, updateDysonSwarmUI } = require('../src/js/projects/dysonswarmUI.js'));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    global.projectElements = originalProjectElements;
    global.formatNumber = originalFormatNumber;
    global.resources = originalResources;
    global.window = originalWindow;
    global.document = originalDocument;
  });

  const buildProject = () => ({
    name: 'dysonSwarmReceiver',
    isCompleted: true,
    collectors: 1,
    energyPerCollector: 1,
    collectorCost: { colony: { metal: 1 } },
    collectorDuration: 1000,
    collectorProgress: 0,
    autoDeployCollectors: false,
    unlocked: true,
    autoStartUncheckOnTravel: true,
    canStartCollector: () => true,
    startCollector: jest.fn(),
  });

  it('keeps both travel reset checkboxes aligned with the project state', () => {
    const project = buildProject();
    const container = document.createElement('div');
    document.body.appendChild(container);

    renderDysonSwarmUI(project, container);
    const elements = projectElements[project.name];

    // Simulate the general projects UI attaching its own checkbox
    elements.autoStartTravelResetCheckbox = { checked: false, disabled: false };

    updateDysonSwarmUI(project);

    expect(elements.collectorAutoStartTravelResetCheckbox.checked).toBe(true);
    expect(elements.autoStartTravelResetCheckbox.checked).toBe(true);

    project.autoStartUncheckOnTravel = false;
    updateDysonSwarmUI(project);

    expect(elements.collectorAutoStartTravelResetCheckbox.checked).toBe(false);
    expect(elements.autoStartTravelResetCheckbox.checked).toBe(false);
  });
});

