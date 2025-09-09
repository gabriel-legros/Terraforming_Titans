const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('research subtab visibility reset on load', () => {
  test('advanced research tab hides when save lacks unlock', () => {
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
    const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');
    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const saveCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');

    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="research-subtab hidden" data-subtab="advanced-research"></div>
      <div id="advanced-research" class="research-subtab-content hidden"></div>
      <div class="tab" id="buildings-tab" data-tab="buildings"></div>
      <div id="buildings" class="tab-content"></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.window = dom.window;
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    vm.runInContext(uiUtilsCode + effectCode + researchUICode + researchCode + saveCode + '; this.ResearchManagerRef = ResearchManager;', ctx);

    // stubs required by save.js
    ctx.dayNightCycle = { saveState: () => ({}), loadState: () => {} };
    ctx.resources = {};
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.projectManager = { saveState: () => ({}), loadState: () => {} };
    ctx.researchManager = new ctx.ResearchManagerRef({ advanced: [] });
    ctx.oreScanner = { saveState: () => ({}), loadState: () => {} };
    ctx.terraforming = { saveState: () => ({}), loadState: () => {} };
    ctx.storyManager = { saveState: () => ({}), loadState: () => {}, appliedEffects: [], reapplyEffects: () => {} };
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
    ctx.ghgFactorySettings = {
      autoDisableAboveTemp: false,
      disableTempThreshold: 283.15,
      reverseTempThreshold: 283.15,
    };
    ctx.oxygenFactorySettings = { autoDisableAbovePressure: false, disablePressureThreshold: 15 };
    ctx.enforceGhgFactoryTempGap = () => {};
    ctx.mirrorOversightSettings = {};
    ctx.playTimeSeconds = 0;
    ctx.planetParameters = { mars: { resources: {} } };
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
    ctx.autosave = () => {};
    ctx.startNewGame = () => {};
    ctx.tabManager = { resetVisibility: () => {}, activateTab: () => {} };
    ctx.tabParameters = { tabs: [] };

    ctx.initializeGameState = () => {
      ctx.researchManager = new ctx.ResearchManagerRef({ advanced: [] });
    };

    // Unlock advanced research before saving
    ctx.researchManager.addAndReplace({
      type: 'booleanFlag',
      flagId: 'advancedResearchUnlocked',
      value: true,
      effectId: 'test',
      sourceId: 'test'
    });
    ctx.updateAdvancedResearchVisibility();

    const visibleBefore = dom.window.document.querySelector('.research-subtab').classList.contains('hidden');
    expect(visibleBefore).toBe(false);

    // Prepare save string without advanced research unlocked
    const saveString = JSON.stringify({ spaceManager: {}, story: { appliedEffects: [] } });
    ctx.saved = saveString;
    vm.runInContext('loadGame(saved);', ctx);

    const hidden = dom.window.document.querySelector('.research-subtab').classList.contains('hidden');
    expect(hidden).toBe(true);
  });
});
