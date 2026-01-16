const { JSDOM } = require('jsdom');

describe('Nanocolony energy allocation input', () => {
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

  beforeEach(() => {
    jest.resetModules();
    setUpDom();

    global.formatNumber = (value) => String(value);
    global.resources = {
      surface: { land: { value: 1 } },
      colony: {},
    };
    global.buildings = {
      sandQuarry: { hasSandAvailable: () => true }
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
    const input = document.getElementById('nanotech-energy-limit');
    const mode = document.getElementById('nanotech-energy-limit-mode');
    return { manager, input, mode };
  };

  it('preserves the raw string while typing in percent mode', () => {
    const { manager, input } = renderNanotech();

    input.focus();
    input.value = '1e3';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('1e3');
    expect(manager.maxEnergyPercent).toBe(100);

    manager.updateUI();
    expect(input.value).toBe('1e3');

    input.blur();
    expect(input.value).toBe('100');
  });

  it('accepts flexible numbers in absolute mode and formats on blur', () => {
    const { manager, input, mode } = renderNanotech();
    global.formatNumber = (value) => `fmt:${value}`;

    mode.value = 'absolute';
    mode.dispatchEvent(new window.Event('change', { bubbles: true }));

    input.focus();
    input.value = '2.5M';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(input.value).toBe('2.5M');
    expect(manager.maxEnergyAbsolute).toBe(2500000);

    input.blur();
    expect(input.value).toBe('fmt:2500000');
  });

  it('formats large absolute values when not focused', () => {
    const { manager, input, mode } = renderNanotech();
    global.formatNumber = (value) => `fmt:${value}`;

    mode.value = 'absolute';
    mode.dispatchEvent(new window.Event('change', { bubbles: true }));

    input.value = '1e9';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    input.blur();

    expect(manager.maxEnergyAbsolute).toBe(1e9);
    expect(input.value).toBe('fmt:1000000000');
  });

  it('defaults absolute mode to 1M watts', () => {
    const { manager, input, mode } = renderNanotech();
    global.formatNumber = (value) => `fmt:${value}`;

    manager.maxEnergyAbsolute = 0;
    mode.value = 'absolute';
    mode.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(manager.maxEnergyAbsolute).toBe(1000000);
    expect(input.value).toBe('fmt:1000000');
  });

  it('shows raw to actual growth when a multiplier applies', () => {
    const { manager } = renderNanotech();
    manager.activeEffects = [{ type: 'nanoColonyGrowthMultiplier', value: 1.5 }];
    manager.updateUI();

    const growthEl = document.getElementById('nanobot-growth-rate');
    expect(growthEl.textContent).toBe('0.400% -> 0.600%');
  });
});
