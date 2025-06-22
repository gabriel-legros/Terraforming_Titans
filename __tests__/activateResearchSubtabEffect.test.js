const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'effectable-entity.js'), 'utf8');
const researchCode = fs.readFileSync(path.join(__dirname, '..', 'research.js'), 'utf8');
const researchUICode = fs.readFileSync(path.join(__dirname, '..', 'researchUI.js'), 'utf8');

describe('activateResearchSubtab effect', () => {
  test('switches to advanced research subtab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="research-subtab active" data-subtab="energy-research"></div>
      <div class="research-subtab" data-subtab="advanced-research"></div>
      <div id="energy-research" class="research-subtab-content active"></div>
      <div id="advanced-research" class="research-subtab-content"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.globalGameIsLoadingFromSave = false;
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    vm.runInContext(effectCode + researchUICode + researchCode + '; this.EffectableEntity = EffectableEntity; this.ResearchManager = ResearchManager;', ctx);

    ctx.researchManager = new ctx.ResearchManager({ advanced: [] });
    ctx.researchManager.addAndReplace({
      type: 'activateResearchSubtab',
      targetId: 'advanced-research',
      effectId: 'test',
      sourceId: 'test'
    });

    const subtab = dom.window.document.querySelector('[data-subtab="advanced-research"]');
    const content = dom.window.document.getElementById('advanced-research');
    expect(subtab.classList.contains('active')).toBe(true);
    expect(content.classList.contains('active')).toBe(true);
  });
});
