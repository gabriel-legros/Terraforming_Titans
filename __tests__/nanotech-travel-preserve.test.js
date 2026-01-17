const { JSDOM } = require('jsdom');

describe('Nanocolony travel preservation', () => {
  const originalDocument = global.document;
  const originalWindow = global.window;
  const originalResources = global.resources;
  const originalCurrentPlanetParameters = global.currentPlanetParameters;
  const originalBuildings = global.buildings;
  const originalFormatNumber = global.formatNumber;
  const originalEffectableEntity = global.EffectableEntity;
  const originalParseFlexibleNumber = global.parseFlexibleNumber;
  const originalWireStringNumberInput = global.wireStringNumberInput;
  const originalNanotechManager = global.nanotechManager;

  const setUpDom = () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
  };

  const setUpGlobals = () => {
    global.formatNumber = (value) => String(value);
    global.resources = {
      surface: { land: { value: 1 } },
      colony: {},
    };
    global.buildings = {
      sandQuarry: { hasSandAvailable: () => true },
    };
    global.currentPlanetParameters = {
      specialAttributes: { hasSand: true },
      resources: { underground: { ore: { maxDeposits: 1 } } },
    };
    global.EffectableEntity = class {
      constructor() {
        this.activeEffects = [];
        this.booleanFlags = new Set();
        this.growthMultiplierOverride = 1;
      }
      isBooleanFlagSet(flagId) {
        return this.booleanFlags.has(flagId);
      }
      getEffectiveGrowthMultiplier() {
        return this.growthMultiplierOverride;
      }
    };
    global.parseFlexibleNumber = require('../src/js/numbers.js').parseFlexibleNumber;
    global.wireStringNumberInput = require('../src/js/ui-utils.js').wireStringNumberInput;
    global.attachDynamicInfoTooltip = require('../src/js/ui-utils.js').attachDynamicInfoTooltip;
  };

  beforeEach(() => {
    jest.resetModules();
    setUpDom();
    setUpGlobals();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    global.document = originalDocument;
    global.window = originalWindow;
    global.resources = originalResources;
    global.currentPlanetParameters = originalCurrentPlanetParameters;
    global.buildings = originalBuildings;
    global.formatNumber = originalFormatNumber;
    global.EffectableEntity = originalEffectableEntity;
    global.parseFlexibleNumber = originalParseFlexibleNumber;
    global.wireStringNumberInput = originalWireStringNumberInput;
    global.nanotechManager = originalNanotechManager;
  });

  const renderNanotech = () => {
    const controlsSection = document.createElement('div');
    controlsSection.id = 'colony-controls-section';
    document.body.appendChild(controlsSection);

    const { NanotechManager } = require('../src/js/nanotech.js');
    const manager = new NanotechManager();
    global.nanotechManager = manager;
    manager.enable();
    return manager;
  };

  it('caps travel-preserved nanobots based on unlocked stages', () => {
    const { NanotechManager } = require('../src/js/nanotech.js');
    const manager = new NanotechManager();

    manager.nanobots = 1e20;
    manager.prepareForTravel();
    expect(manager.nanobots).toBe(1e15);

    manager.booleanFlags.add('stage2_enabled');
    manager.nanobots = 1e20;
    manager.prepareForTravel();
    expect(manager.nanobots).toBe(1e16);
  });

  it('updates the travel preservation hint and tooltip with stage scaling', () => {
    const manager = renderNanotech();
    const travelCap = document.getElementById('nanotech-travel-cap');
    expect(travelCap.textContent).toBe('1000000000000000');

    const tooltip = document.querySelector('.nanotech-hint .info-tooltip-icon');
    const tooltipText = tooltip.querySelector('.resource-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltipText.textContent).toContain('Stage I');

    manager.booleanFlags.add('stage2_enabled');
    manager.updateUI();
    expect(travelCap.textContent).toBe('10000000000000000');
  });
});
