const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research.js'), 'utf8');
const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'researchUI.js'), 'utf8');

describe('booleanFlag advancedResearchUnlocked', () => {
  test('reveals the advanced research subtab', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="research-subtab hidden" data-subtab="advanced-research"></div><div id="advanced-research" class="research-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.globalGameIsLoadingFromSave = false;
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchCode + researchUICode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager; this.updateAdvancedResearchVisibility = updateAdvancedResearchVisibility;', ctx);

    ctx.researchManager = new ctx.ResearchManager({ advanced: [] });
    ctx.researchManager.addAndReplace({
      type: 'booleanFlag',
      flagId: 'advancedResearchUnlocked',
      value: true,
      effectId: 'test',
      sourceId: 'test'
    });

    ctx.updateAdvancedResearchVisibility();

    const subtab = dom.window.document.querySelector('.research-subtab');
    const content = dom.window.document.getElementById('advanced-research');
    expect(subtab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
  });
});
