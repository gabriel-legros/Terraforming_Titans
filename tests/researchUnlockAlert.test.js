const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('research unlock alert', () => {
  test('shows alert when advanced research unlocks new tech and clears when viewed', () => {
    const html = `<!DOCTYPE html>
      <div id="research-tab"><span id="research-alert" class="unlock-alert">!</span></div>
      <div class="research-subtabs">
        <div class="research-subtab" data-subtab="energy-research">Energy<span id="energy-research-alert" class="unlock-alert">!</span></div>
      </div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.document = dom.window.document;
    ctx.console = console;
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
    ctx.formatNumber = x => x;

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
    const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');
    vm.runInContext(effectCode + researchCode + researchUICode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager;', ctx);

    const data = {
      advanced: [
        {
          id: 'unlock_flag',
          name: 'Unlock Flag',
          description: '',
          cost: {},
          prerequisites: [],
          effects: [{ target: 'researchManager', type: 'booleanFlag', flagId: 'flag', value: true }],
        }
      ],
      energy: [
        {
          id: 'flag_research',
          name: 'Flag Research',
          description: '',
          cost: {},
          prerequisites: [],
          effects: [],
          requiredFlags: ['flag']
        }
      ]
    };

    ctx.researchManager = new ctx.ResearchManager(data);
    ctx.initializeResearchAlerts();
    ctx.markResearchSubtabViewed('advanced-research');

    ctx.researchManager.completeResearch('unlock_flag');
    expect(dom.window.document.getElementById('research-alert').style.display).toBe('inline');
    expect(dom.window.document.getElementById('energy-research-alert').style.display).toBe('inline');

    ctx.markResearchSubtabViewed('energy-research');
    expect(dom.window.document.getElementById('research-alert').style.display).toBe('none');
    expect(ctx.researchManager.getResearchById('flag_research').alertedWhenUnlocked).toBe(true);
  });
});
