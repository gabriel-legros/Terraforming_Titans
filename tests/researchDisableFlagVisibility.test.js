const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('research disable flag visibility', () => {
  function buildContext() {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="energy-research-buttons"></div>
      <div id="industry-research-buttons"></div>
      <div id="colonization-research-buttons"></div>
      <div id="terraforming-research-buttons"></div>
      <div id="advanced-research-buttons"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = () => '';
    ctx.canAffordResearch = () => true;
    ctx.resources = { colony: { research: { value: 0 }, advancedResearch: { value: 0 } } };
    ctx.globalGameIsLoadingFromSave = false;
    ctx.currentPlanetParameters = {
      resources: {
        surface: { liquidMethane: { initialValue: 1 }, hydrocarbonIce: { initialValue: 0 } },
        atmospheric: { atmosphericMethane: { initialValue: 0 } },
        underground: { geothermal: { maxDeposits: 1 } },
      },
    };
    vm.createContext(ctx);
    vm.runInContext(`${effectCode}\n${researchCode}\n${researchUICode}; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.loadResearchCategory = loadResearchCategory; this.updateResearchUI = updateResearchUI;`, ctx);

    const params = {
      energy: [],
      industry: [],
      colonization: [
        {
          id: 'trading',
          name: 'Ship trading',
          description: 'Allows ship trading.',
          cost: { research: 100 },
          prerequisites: [],
          effects: [],
          disableFlag: 'galacticMarket',
        },
        {
          id: 'hab',
          name: 'Habitat upgrades',
          description: 'Adds habitats.',
          cost: { research: 200 },
          prerequisites: [],
          effects: [],
        },
      ],
      terraforming: [],
      advanced: [],
    };

    ctx.researchManager = new ctx.ResearchManager(params);
    return { dom, ctx };
  }

  test('renders other research but hides entries gated by an active disable flag', () => {
    const { dom, ctx } = buildContext();
    ctx.researchManager.booleanFlags.add('galacticMarket');
    ctx.loadResearchCategory('colonization');

    const items = Array.from(dom.window.document.querySelectorAll('#colonization-research-buttons .research-item'));
    const visibleItems = items.filter(item => item.style.display !== 'none');
    expect(visibleItems).toHaveLength(1);
    expect(visibleItems[0].querySelector('.research-button').textContent).toBe('Habitat upgrades');
  });

  test('hides an existing entry once the disable flag becomes active', () => {
    const { dom, ctx } = buildContext();
    ctx.loadResearchCategory('colonization');

    const tradingButton = dom.window.document.getElementById('research-trading');
    expect(tradingButton).toBeTruthy();
    const tradingContainer = tradingButton.parentElement;
    expect(tradingContainer.style.display).toBe('');

    ctx.researchManager.booleanFlags.add('galacticMarket');
    ctx.updateResearchUI();

    const refreshedTrading = dom.window.document.getElementById('research-trading');
    expect(refreshedTrading.parentElement.style.display).toBe('none');
    const otherContainer = dom.window.document.getElementById('research-hab').parentElement;
    expect(otherContainer.style.display).toBe('');
  });
});
