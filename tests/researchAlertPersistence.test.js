const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('research alerts persist after loading', () => {
  test('viewed research does not alert again on load', () => {
    const html = `<!DOCTYPE html>
      <div id="research-tab"><span id="research-alert" class="unlock-alert">!</span></div>
      <div class="research-subtab" data-subtab="energy-research">Energy<span id="energy-research-alert" class="unlock-alert">!</span></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.window = dom.window;
    ctx.console = console;
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.formatNumber = x => x;

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
    const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');
    const saveCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'save.js'), 'utf8');
    vm.runInContext(effectCode + researchCode + researchUICode + saveCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManagerRef = ResearchManager;', ctx);

    // Stubs required by save.js
    ctx.dayNightCycle = { saveState: () => ({}), loadState: () => {} };
    ctx.resources = {};
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.projectManager = { saveState: () => ({}), loadState: () => {} };
    ctx.oreScanner = { saveState: () => ({}), loadState: () => {} };
    ctx.terraforming = { saveState: () => ({}), loadState: () => {} };
    ctx.storyManager = { saveState: () => ({}), loadState: () => {}, appliedEffects: [], reapplyEffects: () => {} };
    ctx.journalEntrySources = [];
    ctx.journalHistorySources = [];
    ctx.goldenAsteroid = { saveState: () => ({}), loadState: () => {} };
    ctx.solisManager = { saveState: () => ({}), loadState: () => {}, reapplyEffects: () => {} };
    ctx.warpGateCommand = { saveState: () => ({}), loadState: () => {}, reapplyEffects: () => {} };
    ctx.lifeDesigner = { saveState: () => ({}), loadState: () => {} };
    ctx.lifeManager = {};
    ctx.milestonesManager = { saveState: () => ({}), loadState: () => {} };
    ctx.skillManager = { saveState: () => ({}), loadState: () => {}, reapplyEffects: () => {} };
    ctx.spaceManager = { saveState: () => ({}), loadState: () => {}, getCurrentPlanetKey: () => 'mars' };
    ctx.selectedBuildCounts = {};
    ctx.colonySliderSettings = {};
    const factorySettings = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ghg-automation.js'), 'utf8');
    vm.runInContext(factorySettings, ctx);
    ctx.mirrorOversightSettings = {};
    ctx.playTimeSeconds = 0;
    ctx.planetParameters = { mars: { resources: {} } };
    ctx.currentPlanetParameters = ctx.planetParameters.mars;
    ctx.buildingsParameters = {};
    ctx.colonyParameters = {};
    ctx.projectParameters = {};
    ctx.skillParameters = {};
    ctx.progressData = {};
    ctx.tabManager = { resetVisibility: () => {}, activateTab: () => {} };
    ctx.tabParameters = { tabs: [] };
    ctx.createBuildingButtons = () => {};
    ctx.initializeBuildingAlerts = () => {};
    ctx.createColonyButtons = () => {};
    ctx.initializeProjectsUI = () => {};
    ctx.renderProjects = () => {};
    ctx.initializeProjectAlerts = () => {};
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
    ctx.applyDayNightSettingEffects = () => {};
    ctx.updateAdvancedResearchVisibility = () => {};
    ctx.updateAllResearchButtons = () => {};
    ctx.mapSourcesToText = arr => arr;
    ctx.loadJournalEntries = () => {};
    ctx.reconstructJournalState = () => {};

    const data = {
      energy: [
        { id: 'power', name: 'Power', description: '', cost: {}, prerequisites: [], effects: [] }
      ]
    };

    // Create save with research viewed
    ctx.researchManager = new ctx.ResearchManagerRef(data);
    ctx.initializeResearchAlerts();
    ctx.markResearchSubtabViewed('energy-research');
    const saveString = JSON.stringify({ spaceManager: {}, story: { appliedEffects: [] }, research: ctx.researchManager.saveState() });

    ctx.initializeGameState = () => {
      ctx.researchManager = new ctx.ResearchManagerRef(data);
      ctx.initializeResearchAlerts();
    };

    ctx.saved = saveString;
    vm.runInContext('loadGame(saved);', ctx);

    expect(dom.window.document.getElementById('research-alert').style.display).toBe('none');
    expect(dom.window.document.getElementById('energy-research-alert').style.display).toBe('none');
  });
});
