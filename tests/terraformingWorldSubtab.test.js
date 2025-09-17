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
  ctx.window.document = ctx.document;
  ctx.window.requestAnimationFrame = ctx.window.requestAnimationFrame || (() => {});
  ctx.window.cancelAnimationFrame = ctx.window.cancelAnimationFrame || (() => {});
  ctx.requestAnimationFrame = ctx.window.requestAnimationFrame;
  ctx.cancelAnimationFrame = ctx.window.cancelAnimationFrame;

  const uiUtilsPath = path.join(__dirname, '..', 'src/js', 'ui-utils.js');
  const subtabManagerPath = path.join(__dirname, '..', 'src/js', 'subtab-manager.js');
  const terraformingPath = path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js');

  const uiUtilsCode = fs.readFileSync(uiUtilsPath, 'utf8');
  vm.runInContext(uiUtilsCode, ctx, { filename: uiUtilsPath });
  if (typeof ctx.activateSubtab === 'function' && ctx.window) {
    ctx.window.activateSubtab = ctx.activateSubtab;
  }

  const subtabManagerCode = fs.readFileSync(subtabManagerPath, 'utf8');
  vm.runInContext(subtabManagerCode, ctx, { filename: subtabManagerPath });
  if (ctx.window && ctx.window.SubtabManager) {
    ctx.SubtabManager = ctx.window.SubtabManager;
  }

  const terraformingCode = fs.readFileSync(terraformingPath, 'utf8');
  vm.runInContext(terraformingCode, ctx, { filename: terraformingPath });

  return { dom, ctx };
}

describe('Terraforming world subtab', () => {
  test('locks summary until unlocked', () => {
    const { dom, ctx } = loadTerraformingUI();
    ctx.initializeTerraformingTabs();

    const summaryButton = dom.window.document.querySelector('[data-subtab="summary-terraforming"]');
    const summaryContent = dom.window.document.getElementById('summary-terraforming');
    const worldContent = dom.window.document.getElementById('world-terraforming');
    const manager = ctx.getTerraformingSubtabManager();

    expect(manager).not.toBeNull();
    expect(manager.isActive('world-terraforming')).toBe(true);

    ctx.setTerraformingSummaryVisibility(true);
    ctx.activateTerraformingSubtab('summary-terraforming');

    expect(summaryButton.classList.contains('hidden')).toBe(false);
    expect(summaryContent.classList.contains('hidden')).toBe(false);
    expect(summaryContent.classList.contains('active')).toBe(true);
    expect(manager.getActiveId()).toBe('summary-terraforming');

    ctx.setTerraformingSummaryVisibility(false);

    expect(summaryButton.classList.contains('hidden')).toBe(true);
    expect(summaryContent.classList.contains('hidden')).toBe(true);
    expect(summaryContent.classList.contains('active')).toBe(false);
    expect(worldContent.classList.contains('active')).toBe(true);
    expect(manager.getActiveId()).toBe('world-terraforming');
  });

  test('life subtab unlock toggles visibility', () => {
    const { dom, ctx } = loadTerraformingUI();
    ctx.initializeTerraformingTabs();

    const lifeButton = dom.window.document.querySelector('[data-subtab="life-terraforming"]');
    const lifeContent = dom.window.document.getElementById('life-terraforming');
    const worldContent = dom.window.document.getElementById('world-terraforming');
    const manager = ctx.getTerraformingSubtabManager();

    expect(lifeButton.classList.contains('hidden')).toBe(true);
    expect(lifeContent.classList.contains('hidden')).toBe(true);

    ctx.setTerraformingLifeVisibility(true);

    expect(lifeButton.classList.contains('hidden')).toBe(false);
    expect(lifeContent.classList.contains('hidden')).toBe(false);

    ctx.activateTerraformingSubtab('life-terraforming');
    expect(lifeContent.classList.contains('active')).toBe(true);
    expect(manager.getActiveId()).toBe('life-terraforming');

    ctx.setTerraformingLifeVisibility(false);

    expect(lifeButton.classList.contains('hidden')).toBe(true);
    expect(lifeContent.classList.contains('hidden')).toBe(true);
    expect(lifeContent.classList.contains('active')).toBe(false);
    expect(worldContent.classList.contains('active')).toBe(true);
    expect(manager.getActiveId()).toBe('world-terraforming');
  });

  test('openTerraformingWorldTab activates terraforming tab', () => {
    const { dom, ctx } = loadTerraformingUI();
    const activatedTabs = [];
    ctx.tabManager = { activateTab: (id) => activatedTabs.push(id) };

    ctx.openTerraformingWorldTab();

    expect(activatedTabs).toEqual(['terraforming']);
    const worldContent = dom.window.document.getElementById('world-terraforming');
    expect(worldContent.classList.contains('active')).toBe(true);
    const manager = ctx.getTerraformingSubtabManager();
    expect(manager && manager.getActiveId()).toBe('world-terraforming');
  });

  test('updateTerraformingUI animates only when world subtab is active', () => {
    const { ctx } = loadTerraformingUI();
    ctx.initializeTerraformingTabs();

    const manager = ctx.getTerraformingSubtabManager();
    expect(manager).not.toBeNull();

    const stubbed = [
      'updatePlayTimeDisplay',
      'updateTemperatureBox',
      'updateAtmosphereBox',
      'updateWaterBox',
      'updateLuminosityBox',
      'updateLifeBox',
      'updateMagnetosphereBox',
      'updateLifeUI',
      'updateCompleteTerraformingButton'
    ];
    stubbed.forEach(name => {
      ctx[name] = jest.fn();
    });

    ctx.window.planetVisualizer = { animate: jest.fn(), onResize: jest.fn() };

    ctx.updateTerraformingUI(0.05);
    expect(ctx.window.planetVisualizer.animate).toHaveBeenCalledTimes(1);

    ctx.setTerraformingSummaryVisibility(true);
    ctx.activateTerraformingSubtab('summary-terraforming');
    expect(manager.getActiveId()).toBe('summary-terraforming');

    ctx.window.planetVisualizer.animate.mockClear();
    ctx.updateTerraformingUI(0.05);
    expect(ctx.window.planetVisualizer.animate).not.toHaveBeenCalled();

    ctx.activateTerraformingSubtab('world-terraforming');
    ctx.updateTerraformingUI(0.05);
    expect(ctx.window.planetVisualizer.animate).toHaveBeenCalledTimes(1);
  });
});
