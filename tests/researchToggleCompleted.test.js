const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('toggleCompletedResearch', () => {
  test('hides and shows completed research items', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="research-item"><button id="research-completed"></button></div><div class="research-item"><button id="research-unfinished"></button></div><button class="toggle-completed-button">Hide Completed</button>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    // stub global dependencies
    ctx.canAffordResearch = () => true;
    ctx.formatNumber = () => '';
    ctx.researchManager = { researches: {
      energy: [
        { id: 'completed', name: 'Done', description: '', cost: { research: 0 }, isResearched: true },
        { id: 'unfinished', name: 'Not Done', description: '', cost: { research: 0 }, isResearched: false }
      ],
      industry: [],
      colonization: [],
      terraforming: [],
      advanced: []
    } };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');
    vm.runInContext(code + '; this.updateAllResearchButtons = updateAllResearchButtons; this.toggleCompletedResearch = toggleCompletedResearch;', ctx);

    // initial render
    ctx.updateAllResearchButtons(ctx.researchManager.researches);

    const completedItem = dom.window.document.querySelector('#research-completed').closest('.research-item');
    expect(completedItem.classList.contains('hidden')).toBe(false);

    ctx.toggleCompletedResearch();

    expect(completedItem.classList.contains('hidden')).toBe(true);
    const button = dom.window.document.querySelector('.toggle-completed-button');
    expect(button.textContent).toBe('Show Completed');
  });
});
