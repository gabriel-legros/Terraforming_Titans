const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

function loadTerraformingUI() {
  const dom = new JSDOM(`<!DOCTYPE html>
    <div class="terraforming-subtabs">
      <div class="terraforming-subtab active" data-subtab="world-terraforming"></div>
      <div class="terraforming-subtab hidden" data-subtab="summary-terraforming"></div>
      <div class="terraforming-subtab hidden" data-subtab="life-terraforming"></div>
      <div class="terraforming-subtab" data-subtab="milestone-terraforming"></div>
    </div>
    <div class="terraforming-subtab-content-wrapper">
      <div id="world-terraforming" class="terraforming-subtab-content active"></div>
      <div id="summary-terraforming" class="terraforming-subtab-content hidden"></div>
      <div id="life-terraforming" class="terraforming-subtab-content hidden"></div>
      <div id="milestone-terraforming" class="terraforming-subtab-content"></div>
    </div>`, { runScripts: 'outside-only' });

  const ctx = dom.getInternalVMContext();
  ctx.window = dom.window;
  ctx.document = dom.window.document;
  ctx.markMilestonesViewed = () => {};

  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
  vm.runInContext(code, ctx);

  return { dom, ctx };
}

describe('Terraforming world subtab', () => {
  test('locks summary until unlocked', () => {
    const { dom, ctx } = loadTerraformingUI();
    ctx.initializeTerraformingTabs();

    const summaryButton = dom.window.document.querySelector('[data-subtab="summary-terraforming"]');
    const summaryContent = dom.window.document.getElementById('summary-terraforming');
    const worldContent = dom.window.document.getElementById('world-terraforming');

    ctx.setTerraformingSummaryVisibility(true);
    ctx.activateTerraformingSubtab('summary-terraforming');

    expect(summaryButton.classList.contains('hidden')).toBe(false);
    expect(summaryContent.classList.contains('hidden')).toBe(false);
    expect(summaryContent.classList.contains('active')).toBe(true);

    ctx.setTerraformingSummaryVisibility(false);

    expect(summaryButton.classList.contains('hidden')).toBe(true);
    expect(summaryContent.classList.contains('hidden')).toBe(true);
    expect(summaryContent.classList.contains('active')).toBe(false);
    expect(worldContent.classList.contains('active')).toBe(true);
  });

  test('life subtab unlock toggles visibility', () => {
    const { dom, ctx } = loadTerraformingUI();
    ctx.initializeTerraformingTabs();

    const lifeButton = dom.window.document.querySelector('[data-subtab="life-terraforming"]');
    const lifeContent = dom.window.document.getElementById('life-terraforming');
    const worldContent = dom.window.document.getElementById('world-terraforming');

    expect(lifeButton.classList.contains('hidden')).toBe(true);
    expect(lifeContent.classList.contains('hidden')).toBe(true);

    ctx.setTerraformingLifeVisibility(true);

    expect(lifeButton.classList.contains('hidden')).toBe(false);
    expect(lifeContent.classList.contains('hidden')).toBe(false);

    ctx.activateTerraformingSubtab('life-terraforming');
    expect(lifeContent.classList.contains('active')).toBe(true);

    ctx.setTerraformingLifeVisibility(false);

    expect(lifeButton.classList.contains('hidden')).toBe(true);
    expect(lifeContent.classList.contains('hidden')).toBe(true);
    expect(lifeContent.classList.contains('active')).toBe(false);
    expect(worldContent.classList.contains('active')).toBe(true);
  });

  test('openTerraformingWorldTab activates terraforming tab', () => {
    const { dom, ctx } = loadTerraformingUI();
    const activatedTabs = [];
    ctx.tabManager = { activateTab: (id) => activatedTabs.push(id) };

    ctx.openTerraformingWorldTab();

    expect(activatedTabs).toEqual(['terraforming']);
    const worldContent = dom.window.document.getElementById('world-terraforming');
    expect(worldContent.classList.contains('active')).toBe(true);
  });
});
