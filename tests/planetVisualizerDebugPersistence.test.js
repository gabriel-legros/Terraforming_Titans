const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(ctx, relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  vm.runInContext(code, ctx);
}

function createGameContext() {
  const ctx = {
    console,
    JSON,
    Math,
    Date,
    structuredClone: (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value))),
  };

  ctx.globalThis = ctx;
  ctx.window = ctx;
  ctx.performance = { now: () => 0 };
  ctx.window.performance = ctx.performance;

  const noop = () => {};
  const classList = { add: noop, remove: noop, toggle: noop, contains: () => false };
  const documentStub = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
    body: { classList },
  };
  ctx.document = documentStub;
  ctx.window.document = documentStub;
  ctx.localStorage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop,
    clear: noop,
  };
  ctx.window.localStorage = ctx.localStorage;

  ctx.navigator = { userAgent: 'node' };
  ctx.window.navigator = ctx.navigator;

  ctx.EffectableEntity = class {};
  ctx.nanotechManager = { reset: noop, updateUI: noop, loadState: noop };
  ctx.generateRandomPlanet = () => null;

  ctx.planetParameters = {
    mars: {
      name: 'Mars',
      celestialParameters: {
        rotationPeriod: 24,
        starLuminosity: 1,
        gravity: 3.7,
        radius: 3389.5,
      },
      buildingParameters: { maintenanceFraction: 0 },
      resources: {
        atmospheric: {},
        colony: {},
        special: {},
      },
    },
  };

  ctx.resources = {
    atmospheric: {
      carbonDioxide: { value: 0 },
      oxygen: { value: 0 },
      inertGas: { value: 0 },
      atmosphericWater: { value: 0 },
      atmosphericMethane: { value: 0 },
    },
    colony: {
      colonists: { value: 0 },
      advancedResearch: { value: 0, unlocked: false },
    },
    special: {
      spaceships: { value: 0 },
      alienArtifact: { value: 0, unlocked: false },
    },
    surface: { land: { reserved: 0 } },
  };

  ctx.buildings = {};
  ctx.colonies = {};
  ctx.buildingsParameters = {};
  ctx.colonyParameters = {};
  ctx.selectedBuildCounts = {};
  ctx.tabParameters = {};

  ctx.dayNightCycle = { saveState: () => ({}), loadState: noop };
  ctx.projectManager = { saveState: () => ({}), loadState: noop, resetRegularResearch: noop };
  ctx.storyManager = { saveState: () => ({}), loadState: noop, appliedEffects: [] };
  ctx.terraforming = { saveState: () => ({}), loadState: noop, luminosity: {}, zonalCoverageCache: {} };
  ctx.oreScanner = { saveState: () => ({}), loadState: noop, scanData: {} };
  ctx.goldenAsteroid = { saveState: () => ({}), loadState: noop };
  ctx.solisManager = { saveState: () => ({}), loadState: noop, reapplyEffects: noop };
  ctx.lifeDesigner = { saveState: () => ({}), loadState: noop };
  ctx.milestonesManager = { saveState: () => ({}), loadState: noop };
  ctx.skillManager = { saveState: () => ({}), loadState: noop };
  ctx.colonySliderSettings = { saveState: () => ({}), loadState: noop };
  ctx.warpGateCommand = { saveState: () => ({}), loadState: noop, reapplyEffects: noop };
  ctx.spaceManager = {
    saveState: () => ({}),
    loadState: noop,
    getCurrentWorldOriginal: () => null,
    getCurrentRandomSeed: () => null,
    getCurrentPlanetKey: () => 'mars',
  };
  ctx.researchManager = { saveState: () => ({}), loadState: noop, researches: [] };
  ctx.lifeManager = { saveState: () => ({}), loadState: noop };

  ctx.tabManager = { activateTab: noop, resetVisibility: noop };

  ctx.createBuildingButtons = noop;
  ctx.initializeBuildingAlerts = noop;
  ctx.createColonyButtons = noop;
  ctx.initializeColonySlidersUI = noop;
  ctx.initializeResearchUI = noop;
  ctx.initializeResearchAlerts = noop;
  ctx.updateAllResearchButtons = noop;
  ctx.updateAdvancedResearchVisibility = noop;
  ctx.updateBuildingDisplay = noop;
  ctx.recalculateLandUsage = noop;
  ctx.openTerraformingWorldTab = noop;
  ctx.applyDayNightSettingEffects = noop;
  ctx.updateDayNightDisplay = noop;
  ctx.updateRender = noop;
  ctx.updateSolisVisibility = noop;
  ctx.redrawWGCTeamCards = noop;
  ctx.updateWGCUI = noop;
  ctx.updateWGCVisibility = noop;
  ctx.enforceGhgFactoryTempGap = noop;
  ctx.loadConstructionOfficeState = noop;
  ctx.saveConstructionOfficeState = () => ({});

  ctx.captureAutoBuildSettings = noop;
  ctx.restoreAutoBuildSettings = noop;
  ctx.captureConstructionOfficeSettings = () => ({});
  ctx.restoreConstructionOfficeSettings = noop;

  ctx.updateHopeAlert = noop;
  ctx.updateCompletedResearchVisibility = noop;
  ctx.initializeGameState = noop;
  ctx.mapSourcesToText = () => [];
  ctx.loadJournalEntries = noop;
  ctx.reconstructJournalState = noop;

  vm.createContext(ctx);

  loadScript(ctx, 'src/js/globals.js');
  loadScript(ctx, 'src/js/planet-visualizer/debug.js');
  loadScript(ctx, 'src/js/save.js');

  return ctx;
}

describe('planet visualizer debug persistence', () => {
  test('debug_mode persists into save settings', () => {
    const ctx = createGameContext();

    expect(ctx.gameSettings.planetVisualizerDebugEnabled).toBe(false);

    const result = ctx.debug_mode(true);

    expect(result).toBe(true);
    expect(ctx.gameSettings.planetVisualizerDebugEnabled).toBe(true);
    expect(ctx.planetVisualizerDebugEnabled).toBe(true);

    const state = ctx.getGameState();
    expect(state.settings.planetVisualizerDebugEnabled).toBe(true);
  });

  test('loadGame re-applies saved debug mode to the visualizer', () => {
    const ctx = createGameContext();

    ctx.gameSettings.planetVisualizerDebugEnabled = false;
    ctx.planetVisualizer = { setDebugMode: jest.fn() };

    ctx.loadGame(JSON.stringify({ settings: { planetVisualizerDebugEnabled: true } }));

    expect(ctx.gameSettings.planetVisualizerDebugEnabled).toBe(true);
    expect(ctx.planetVisualizerDebugEnabled).toBe(true);
    expect(ctx.planetVisualizer.setDebugMode).toHaveBeenCalledWith(true, { skipPersist: true });
  });
});
