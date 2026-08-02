const fs = require('fs');
const path = require('path');
const { createGameDom } = require('./helpers/jsdom-game-harness.js');

function getGameGlobal(window, name) {
  return window.eval(name);
}

function createAccumulatedChanges() {
  return {
    colony: {
      energy: 0,
      silicon: 0,
      metal: 0,
      glass: 0,
      components: 0,
      electronics: 0,
    },
    surface: {
      junk: 0,
      scrapMetal: 0,
      trash: 0,
      biomass: 0,
      graphite: 0,
      hazardousBiomass: 0,
    },
    special: {},
  };
}

function collectParameterLanguagePaths(value, paths = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectParameterLanguagePaths(entry, paths));
  } else if (value && Object.prototype.toString.call(value) === '[object Object]') {
    Object.keys(value).forEach((key) => {
      if (key.endsWith('Path') || key === 'path') paths.push(value[key]);
      else collectParameterLanguagePaths(value[key], paths);
    });
  }
  return paths;
}

describe('NanotechManager characterization', () => {
  jest.setTimeout(60000);

  let dom;
  let window;
  let manager;
  let resources;

  beforeAll(async () => {
    dom = await createGameDom();
    window = dom.window;
    manager = getGameGlobal(window, 'nanotechManager');
    resources = getGameGlobal(window, 'resources');
  });

  afterAll(() => {
    dom.window.close();
  });

  beforeEach(() => {
    manager.activeEffects = [];
    manager.booleanFlags.clear();
    manager.reset();
    manager.enabled = true;
  });

  it('makes Stage IV graphene metal available to Stage II in the same tick', () => {
    manager.booleanFlags.add('stage2_enabled');
    manager.booleanFlags.add('stage4_enabled');
    manager.nanobots = 1e20;
    manager.grapheneSlider = 10;
    manager.siliconLimitMode = 'uncapped';
    manager.metalLimitMode = 'uncapped';
    manager.graphiteLimitMode = 'uncapped';

    resources.colony.energy.value = 1e12;
    resources.colony.silicon.value = 1e12;
    resources.colony.metal.value = 0;
    resources.surface.graphite.value = 1e12;

    const accumulatedChanges = createAccumulatedChanges();
    manager.produceResources(1000, accumulatedChanges, {});

    expect(manager.currentGrapheneProduction).toBeCloseTo(10, 10);
    expect(manager.currentMetalConsumption).toBeCloseTo(10, 10);
    expect(accumulatedChanges.colony.metal).toBeCloseTo(0, 10);
    expect(accumulatedChanges.surface.graphite).toBeCloseTo(-10, 10);
  });

  it('processes every enabled stage with the current rates, penalties, and resource deltas', () => {
    ['stage2_enabled', 'stage3_enabled', 'stage4_enabled', 'stageSkull_enabled'].forEach((flag) => {
      manager.booleanFlags.add(flag);
    });
    manager.nanobots = 1e20;
    manager.glassSlider = 10;
    manager.componentsSlider = 10;
    manager.electronicsSlider = 10;
    manager.grapheneSlider = 10;
    manager.hazardousBiomassSlider = 10;
    manager.hazardousBiomass2Slider = 5;
    manager.energyLimitMode = 'uncapped';
    manager.siliconLimitMode = 'uncapped';
    manager.metalLimitMode = 'uncapped';
    manager.biomassLimitMode = 'uncapped';
    manager.graphiteLimitMode = 'uncapped';

    resources.colony.energy.value = 1e12;
    resources.colony.silicon.value = 1e12;
    resources.colony.metal.value = 0;
    resources.surface.biomass.value = 1e12;
    resources.surface.graphite.value = 1e12;
    resources.surface.hazardousBiomass.value = 1e12;

    const accumulatedChanges = createAccumulatedChanges();
    manager.produceResources(1000, accumulatedChanges, {});

    expect(manager.currentSiliconConsumption).toBeCloseTo(100, 10);
    expect(manager.currentGlassProduction).toBeCloseTo(100, 10);
    expect(manager.currentGraphiteConsumption).toBeCloseTo(10, 10);
    expect(manager.currentGrapheneProduction).toBeCloseTo(10, 10);
    expect(manager.currentMetalConsumption).toBeCloseTo(10, 10);
    expect(manager.currentComponentsProduction).toBeCloseTo(10, 10);
    expect(manager.currentBiomassConsumption).toBeCloseTo(10, 10);
    expect(manager.currentElectronicsProduction).toBeCloseTo(10, 10);
    expect(manager.currentHazardousBiomassConsumption).toBeCloseTo(25, 10);
    expect(accumulatedChanges.colony.silicon).toBeCloseTo(-100, 10);
    expect(accumulatedChanges.colony.metal).toBeCloseTo(0, 10);
    expect(accumulatedChanges.colony.glass).toBeCloseTo(100, 10);
    expect(accumulatedChanges.colony.components).toBeCloseTo(10, 10);
    expect(accumulatedChanges.colony.electronics).toBeCloseTo(10, 10);
    expect(accumulatedChanges.colony.energy).toBeCloseTo(-1e8, 2);
    expect(accumulatedChanges.surface.biomass).toBeCloseTo(-10, 10);
    expect(accumulatedChanges.surface.graphite).toBeCloseTo(-10, 10);
    expect(accumulatedChanges.surface.hazardousBiomass).toBeCloseTo(-25, 10);
    expect(manager.getGrowthRateBreakdown().rawRate).toBeCloseTo(0.03925, 10);
  });

  it('preserves the public save-state shape and default control values', () => {
    expect(manager.saveState()).toEqual({
      nanobots: 1,
      showNanobotsInSidebar: false,
      travelNanobotFloor: 1,
      siliconSlider: 10,
      maintenanceSlider: 0,
      glassSlider: 0,
      metalSlider: 10,
      maintenance2Slider: 0,
      componentsSlider: 0,
      maintenance3Slider: 0,
      electronicsSlider: 0,
      stage3Resource: 'biomass',
      maintenance4Slider: 0,
      grapheneSlider: 0,
      hazardousBiomassSlider: 0,
      hazardousBiomass2Slider: 0,
      maxEnergyPercent: 10,
      maxEnergyAbsolute: 1e6,
      energyLimitMode: 'percent',
      maxSiliconPercent: 10,
      maxSiliconAbsolute: 1e6,
      siliconLimitMode: 'percent',
      maxMetalPercent: 10,
      maxMetalAbsolute: 1e6,
      metalLimitMode: 'percent',
      maxBiomassPercent: 10,
      maxBiomassAbsolute: 1e6,
      biomassLimitMode: 'percent',
      maxGraphitePercent: 10,
      maxGraphiteAbsolute: 1e6,
      graphiteLimitMode: 'percent',
      onlyScrap: false,
      onlyTrash: false,
      onlyJunk: false,
      uncappedScrap: false,
      uncappedTrash: false,
      uncappedJunk: false,
    });
  });

  it('resolves every Nanotech localization path without fallback copy', () => {
    const sourcePaths = ['nanotech.js', 'nanotechUI.js'].flatMap((fileName) => {
      const source = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'js', 'colony', fileName), 'utf8');
      return Array.from(source.matchAll(/\bt\('([^']+)'/g), (match) => match[1]);
    });
    const parameterPaths = collectParameterLanguagePaths(getGameGlobal(window, 'NANOTECH_STAGE_PARAMETERS'))
      .concat(collectParameterLanguagePaths(getGameGlobal(window, 'NANOTECH_SKULL_STAGE_PARAMETER')))
      .concat(collectParameterLanguagePaths(getGameGlobal(window, 'NANOTECH_TOOLTIP_PARAMETERS')));
    const translate = getGameGlobal(window, 't');

    Array.from(new Set(sourcePaths.concat(parameterPaths))).forEach((languagePath) => {
      expect(translate(languagePath)).not.toBe(languagePath);
    });
  });

  it('renders the current stage layout and binds its controls to manager state', () => {
    manager.booleanFlags.add('stage2_enabled');
    manager.booleanFlags.add('stage3_enabled');
    manager.booleanFlags.add('stage4_enabled');
    manager.booleanFlags.add('stageSkull_enabled');
    manager.updateUI();

    const container = window.document.getElementById('nanocolony-container');
    const stageIds = Array.from(container.querySelectorAll('.nanotech-stage')).map(element => element.id);
    const rangeIds = Array.from(container.querySelectorAll('input[type="range"]')).map(element => element.id);
    const limitIds = Array.from(container.querySelectorAll('.nanotech-energy-limit > input')).map(element => element.id);

    expect(stageIds).toEqual([
      '',
      'nanotech-stage-2',
      'nanotech-stage-3',
      'nanotech-stage-4',
      'nanotech-stage-skull',
    ]);
    expect(rangeIds).toEqual([
      'nanotech-maintenance-slider',
      'nanotech-glass-slider',
      'nanotech-maintenance2-slider',
      'nanotech-components-slider',
      'nanotech-maintenance3-slider',
      'nanotech-electronics-slider',
      'nanotech-maintenance4-slider',
      'nanotech-graphene-slider',
      'nanotech-hazardous-biomass-slider',
      'nanotech-hazardous-biomass2-slider',
    ]);
    expect(limitIds).toEqual([
      'nanotech-energy-limit',
      'nanotech-silicon-limit',
      'nanotech-metal-limit',
      'nanotech-biomass-limit',
      'nanotech-graphite-limit',
    ]);

    const componentsSlider = window.document.getElementById('nanotech-components-slider');
    componentsSlider.value = '7';
    componentsSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(manager.componentsSlider).toBe(7);

    const metalMode = window.document.getElementById('nanotech-metal-limit-mode');
    metalMode.value = 'absolute';
    metalMode.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(manager.metalLimitMode).toBe('absolute');
  });

  it('keeps stage and recycling visibility tied to their existing boolean flags', () => {
    manager.updateUI();

    expect(window.document.getElementById('nanotech-stage-2').style.display).toBe('none');
    expect(window.document.getElementById('nanotech-stage-3').style.display).toBe('none');
    expect(window.document.getElementById('nanotech-stage-4').style.display).toBe('none');
    expect(window.document.getElementById('nanotech-stage-skull').style.display).toBe('none');
    expect(window.document.getElementById('nanotech-only-junk-wrapper').style.display).toBe('none');

    ['stage2_enabled', 'stage3_enabled', 'stage4_enabled', 'stageSkull_enabled', 'nanotechRecycling'].forEach((flag) => {
      manager.booleanFlags.add(flag);
    });
    manager.updateUI();

    expect(window.document.getElementById('nanotech-stage-2').style.display).toBe('');
    expect(window.document.getElementById('nanotech-stage-3').style.display).toBe('');
    expect(window.document.getElementById('nanotech-stage-4').style.display).toBe('');
    expect(window.document.getElementById('nanotech-stage-skull').style.display).toBe('');
    expect(window.document.getElementById('nanotech-only-junk-wrapper').style.display).toBe('');
    expect(window.document.getElementById('nanotech-only-scrap-wrapper').style.display).toBe('');
    expect(window.document.getElementById('nanotech-only-trash-wrapper').style.display).toBe('');
  });
});
