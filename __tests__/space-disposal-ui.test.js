const { describe, beforeEach, afterEach, test, expect } = global;

const { JSDOM } = require('jsdom');

describe('Space disposal UI phases', () => {
  let dom;
  let originalWindow;
  let originalDocument;
  let originalProjectElements;
  let originalResources;
  let originalProject;
  let originalSpaceshipProject;

  beforeEach(() => {
    jest.resetModules();

    originalWindow = global.window;
    originalDocument = global.document;
    originalProjectElements = global.projectElements;
    originalResources = global.resources;
    originalProject = global.Project;
    originalSpaceshipProject = global.SpaceshipProject;

    dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;

    global.projectElements = {};
    global.resources = {
      colony: {
        water: { displayName: 'Water' },
      },
      surface: {
        liquidWater: { displayName: 'Water' },
        ice: { displayName: 'Ice' },
        liquidCO2: { displayName: 'Liquid CO2' },
        dryIce: { displayName: 'Dry Ice' },
        liquidMethane: { displayName: 'Liquid Methane' },
        hydrocarbonIce: { displayName: 'Methane Ice' },
        liquidAmmonia: { displayName: 'Liquid Ammonia' },
        ammoniaIce: { displayName: 'Ammonia Ice' },
      },
      atmospheric: {
        atmosphericWater: { displayName: 'Water Vap.' },
        atmosphericAmmonia: { displayName: 'Ammonia' },
        carbonDioxide: { displayName: 'Carbon Dioxide' },
        atmosphericMethane: { displayName: 'Methane' },
        oxygen: { displayName: 'Oxygen' },
      },
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
    };

    require('../src/js/planet-resource-parameters.js');

    global.SpaceshipProject = require('../src/js/projects/SpaceshipProject.js');
  });

  afterEach(() => {
    if (global.document) {
      document.body.innerHTML = '';
    }
    global.window = originalWindow;
    global.document = originalDocument;
    global.projectElements = originalProjectElements;
    global.resources = originalResources;
    global.Project = originalProject;
    global.SpaceshipProject = originalSpaceshipProject;
  });

  test('builds type and phase selects for multi-phase resources', () => {
    const SpaceExportBaseProject = require('../src/js/projects/SpaceExportBaseProject.js');
    const project = new SpaceExportBaseProject(
      {
        attributes: {
          disposable: {
            colony: ['water'],
            surface: [
              'liquidWater',
              'ice',
              'liquidCO2',
              'dryIce',
              'liquidMethane',
              'hydrocarbonIce',
              'liquidAmmonia',
              'ammoniaIce',
            ],
            atmospheric: [
              'atmosphericWater',
              'atmosphericAmmonia',
              'carbonDioxide',
              'atmosphericMethane',
              'oxygen',
            ],
          },
        },
      },
      'disposeResources'
    );

    project.updateUI = jest.fn();

    const section = project.createResourceDisposalUI();
    document.body.appendChild(section);

    const elements = projectElements[project.name];
    const typeSelect = elements.disposalTypeSelect;
    const phaseSelect = elements.disposalPhaseSelect;

    const typeLabels = Array.from(typeSelect.options).map((option) => option.textContent);
    expect(typeLabels).toEqual(
      expect.arrayContaining(['Water', 'Carbon Dioxide', 'Methane', 'Oxygen', 'Ammonia'])
    );

    const waterOption = Array.from(typeSelect.options).find(
      (option) => option.textContent === 'Water'
    );
    typeSelect.value = waterOption.value;
    typeSelect.dispatchEvent(new window.Event('change'));

    const phaseLabels = Array.from(phaseSelect.options).map((option) => option.textContent);
    expect(phaseLabels).toEqual([
      'Colony Water',
      'Surface Liquid Water',
      'Surface Ice',
      'Atmospheric Water',
    ]);

    const atmosphericOption = Array.from(phaseSelect.options).find(
      (option) => option.textContent === 'Atmospheric Water'
    );
    phaseSelect.value = atmosphericOption.value;
    phaseSelect.dispatchEvent(new window.Event('change'));

    expect(project.selectedDisposalResource).toEqual({
      category: 'atmospheric',
      resource: 'atmosphericWater',
    });
  });
});
