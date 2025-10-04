const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('advanced research alerts when locked', () => {
  test('does not alert when advanced tab is locked', () => {
    const html = `<!DOCTYPE html>
      <div id="research-tab"><span id="research-alert" class="unlock-alert">!</span></div>
      <span id="advanced-research-alert" class="unlock-alert">!</span>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.formatNumber = x => x;
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.fundingModule = {};
    ctx.populationModule = {};
    ctx.projectManager = { projects: {} };
    ctx.tabManager = {};
    ctx.globalEffects = {};
    ctx.terraforming = {};
    ctx.lifeDesigner = {};
    ctx.lifeManager = {};
    ctx.oreScanner = {};
    ctx.solisManager = {};
    ctx.spaceManager = {};
    ctx.warpGateCommand = {};
    ctx.buildings = {};
    ctx.colonies = {};

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
    const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');
    vm.runInContext(effectCode + researchCode + researchUICode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager;', ctx);

    const data = { advanced: [ { id: 'adv1', name: 'Adv1', description: '', cost: {}, prerequisites: [], effects: [] } ] };
    ctx.researchManager = new ctx.ResearchManager(data);

    ctx.initializeResearchAlerts();

    expect(dom.window.document.getElementById('research-alert').style.display).toBe('none');
    expect(dom.window.document.getElementById('advanced-research-alert').style.display).toBe('none');
  });
});
