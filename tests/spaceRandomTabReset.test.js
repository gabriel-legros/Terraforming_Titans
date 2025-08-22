const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('space random tab visibility reset on load', () => {
  test('random tab hides when save lacks unlock', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="space-subtab" data-subtab="space-story"></div>
      <div class="space-subtab" data-subtab="space-random"></div>
      <div id="space-story" class="space-subtab-content">
        <div id="planet-selection-options"></div>
        <div id="travel-status"></div>
      </div>
      <div id="space-random" class="space-subtab-content"></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.window = dom.window;
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.planetParameters = {
      mars: { name: 'Mars', celestialParameters: { distanceFromSun: 1, gravity: 3.7, radius: 3389, albedo: 0.25 }, resources: {} }
    };
    ctx.currentPlanetParameters = ctx.planetParameters.mars;
    ctx.buildingsParameters = {};
    ctx.colonyParameters = {};
    ctx.tabParameters = { tabs: [] };

    vm.createContext(ctx);

    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
    const spaceUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'spaceUI.js'), 'utf8');
    const saveCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');
    vm.runInContext(`${uiUtilsCode}\n${effectCode}\n${spaceCode}\n${spaceUICode}\n${saveCode}; this.SpaceManager = SpaceManager;`, ctx);

    // Stub globals required by save.js
    ctx.dayNightCycle = { saveState: () => ({}), loadState: () => {} };
    ctx.resources = {};
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.projectManager = { saveState: () => ({}), loadState: () => {} };
    ctx.researchManager = { saveState: () => ({}), loadState: () => {}, researches: {} };
    ctx.oreScanner = { saveState: () => ({}), loadState: () => {} };
    ctx.terraforming = { saveState: () => ({}), loadState: () => {} };
    ctx.storyManager = { saveState: () => ({}), loadState: () => {}, appliedEffects: [], reapplyEffects: () => {} };
    ctx.journalEntrySources = [];
    ctx.journalHistorySources = [];
    ctx.goldenAsteroid = { saveState: () => ({}), loadState: () => {} };
    ctx.nanotechManager = { saveState: () => ({}), loadState: () => {}, reset: () => {}, reapplyEffects: () => {}, updateUI: () => {} };
    ctx.solisManager = { saveState: () => ({}), loadState: () => {}, reapplyEffects: () => {} };
    ctx.warpGateCommand = { saveState: () => ({}), loadState: () => {}, reapplyEffects: () => {} };
    ctx.lifeDesigner = { saveState: () => ({}), loadState: () => {} };
    ctx.milestonesManager = { saveState: () => ({}), loadState: () => {} };
    ctx.skillManager = { saveState: () => ({}), loadState: () => {}, reapplyEffects: () => {} };
    ctx.selectedBuildCounts = {};
    ctx.gameSettings = {};
    ctx.colonySliderSettings = {};
    ctx.ghgFactorySettings = {};
    ctx.mirrorOversightSettings = {};
    ctx.playTimeSeconds = 0;

    ctx.createBuildingButtons = () => {};
    ctx.createColonyButtons = () => {};
    ctx.initializeProjectsUI = () => {};
    ctx.renderProjects = () => {};
    ctx.initializeColonySlidersUI = () => {};
    ctx.initializeResearchUI = () => {};
    ctx.initializeHopeUI = () => {};
    ctx.createMilestonesUI = () => {};
    ctx.createResourceDisplay = () => {};
    ctx.updateDayNightDisplay = () => {};
    ctx.updateBuildingDisplay = () => {};
    ctx.updateResearchUI = () => {};
    ctx.updateTerraformingUI = () => {};
    ctx.updateWarnings = () => {};
    ctx.updateMilestonesUI = () => {};
    ctx.updateHopeUI = () => {};
    ctx.autosave = () => {};
    ctx.startNewGame = () => {};
    ctx.tabManager = { resetVisibility: () => {}, activateTab: () => {} };

    // Avoid rendering current world details
    ctx.updateCurrentWorldUI = () => {};

    ctx.initializeGameState = () => {
      ctx.initializeSpaceUI(ctx.spaceManager);
    };

    // Initial setup with random tab unlocked
    ctx.spaceManager = new ctx.SpaceManager(ctx.planetParameters);
    ctx.initializeGameState();
    ctx.spaceManager.enableRandomTab();

    let visible = vm.runInContext('spaceRandomTabVisible', ctx);
    expect(visible).toBe(true);

    const saveString = JSON.stringify({ spaceManager: {} });
    ctx.saved = saveString;
    vm.runInContext('loadGame(saved);', ctx);

    const tab = dom.window.document.querySelector('[data-subtab="space-random"]');
    const content = dom.window.document.getElementById('space-random');
    visible = vm.runInContext('spaceRandomTabVisible', ctx);
    expect(visible).toBe(false);
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);
  });
});

