const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('tab visibility reset on load', () => {
  test('hidden tabs revert to default when loading a save', () => {
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const tabCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'tab.js'), 'utf8');
    const saveCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');

    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="tab" id="buildings-tab" data-tab="buildings"></div>
      <div class="tab hidden" id="research-tab" data-tab="research"></div>
      <div id="buildings" class="tab-content"></div>
      <div id="research" class="tab-content"></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.window = dom.window;
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    vm.runInContext(effectCode + tabCode + saveCode + '; this.TabManagerRef = TabManager; this.tabParameters = tabParameters;', ctx);

    // stub globals required by save.js
    ctx.dayNightCycle = { saveState: () => ({}), loadState: () => {} };
    ctx.resources = {};
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.projectManager = { saveState: () => ({}), loadState: () => {} };
    ctx.researchManager = { saveState: () => ({}), loadState: () => {}, researches:{} };
    ctx.oreScanner = { saveState: () => ({}), loadState: () => {} };
    ctx.terraforming = { saveState: () => ({}), loadState: () => {} };
    ctx.storyManager = { saveState: () => ({}), loadState: () => {} };
    ctx.journalEntrySources = [];
    ctx.journalHistorySources = [];
    ctx.goldenAsteroid = { saveState: () => ({}), loadState: () => {} };
    ctx.solisManager = { saveState: () => ({}), loadState: () => {}, reapplyEffects: () => {} };
    ctx.lifeDesigner = { saveState: () => ({}), loadState: () => {} };
    ctx.milestonesManager = { saveState: () => ({}), loadState: () => {} };
    ctx.skillManager = { saveState: () => ({}), loadState: () => {} };
    ctx.spaceManager = { saveState: () => ({}), loadState: () => {}, getCurrentPlanetKey: () => 'mars' };
    ctx.selectedBuildCounts = {};
    ctx.gameSettings = {};
    ctx.colonySliderSettings = {};
    ctx.ghgFactorySettings = {};
    ctx.mirrorOversightSettings = {};
    ctx.playTimeSeconds = 0;
    ctx.planetParameters = { mars: { resources:{} } };
    ctx.currentPlanetParameters = ctx.planetParameters.mars;
    ctx.buildingsParameters = {};
    ctx.colonyParameters = {};

    ctx.createBuildingButtons = () => {};
    ctx.createColonyButtons = () => {};
    ctx.initializeProjectsUI = () => {};
    ctx.renderProjects = () => {};
    ctx.initializeColonySlidersUI = () => {};
    ctx.initializeResearchUI = () => {};
    ctx.initializeHopeUI = () => {};
    ctx.createMilestonesUI = () => {};
    ctx.initializeSpaceUI = () => {};
    ctx.updateSpaceUI = () => {};
    ctx.createResourceDisplay = () => {};
    ctx.updateDayNightDisplay = () => {};
    ctx.updateBuildingDisplay = () => {};
    ctx.updateResearchUI = () => {};
    ctx.updateTerraformingUI = () => {};
    ctx.updateWarnings = () => {};
    ctx.updateMilestonesUI = () => {};
    ctx.updateHopeUI = () => {};
    ctx.renderProjects = () => {};
    ctx.autosave = () => {};
    ctx.startNewGame = () => {};

    ctx.initializeGameState = () => {
      ctx.tabManager = new ctx.TabManagerRef({ description: 'test' }, ctx.tabParameters);
    };

    // initial setup
    vm.runInContext('initializeGameState();', ctx);
    vm.runInContext('tabManager.enable("research-tab");', ctx);

    const saveString = JSON.stringify({ spaceManager: {} });
    ctx.saved = saveString;
    vm.runInContext('loadGame(saved);', ctx);

    const hidden = ctx.document.getElementById('research-tab').classList.contains('hidden');
    expect(hidden).toBe(true);
  });
});
