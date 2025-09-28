const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Galaxy tab unlock', () => {
  test('enabling the galaxy manager reveals and focuses the subtab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="tab" data-tab="settings"></div>
      <div class="tab" data-tab="space"></div>
      <div id="settings" class="tab-content active"></div>
      <div id="space" class="tab-content"></div>
      <div class="space-subtab" data-subtab="space-story"></div>
      <div class="space-subtab hidden" data-subtab="space-random"></div>
      <div class="space-subtab hidden" data-subtab="space-galaxy"></div>
      <div id="space-story" class="space-subtab-content active">
        <div id="planet-selection-options"></div>
        <div id="travel-status"></div>
      </div>
      <div id="space-random" class="space-subtab-content hidden"></div>
      <div id="space-galaxy" class="space-subtab-content hidden"></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.window = dom.window;
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.planetParameters = {
      mars: {
        name: 'Mars',
        celestialParameters: { distanceFromSun: 1, gravity: 3.7, radius: 3389, albedo: 0.25 },
      },
    };
    vm.createContext(ctx);

    const scripts = [
      'ui-utils.js',
      'subtab-manager.js',
      'effectable-entity.js',
      'tab.js',
      'space.js',
      'spaceUI.js',
      'galaxy/galaxy.js',
      'galaxy/galaxyUI.js',
    ].map(file => fs.readFileSync(path.join(__dirname, '..', 'src/js', file), 'utf8'));
    vm.runInContext(`${scripts.join('\n')}; this.SpaceManager = SpaceManager; this.GalaxyManager = GalaxyManager; this.TabManager = TabManager;`, ctx);

    ctx.spaceManager = new ctx.SpaceManager(ctx.planetParameters);
    ctx.galaxyManager = new ctx.GalaxyManager();
    ctx.tabManager = { activateTab(id) { this.lastActivated = id; } };
    ctx.initializeSpaceUI(ctx.spaceManager);
    ctx.galaxyManager.initialize();

    const galaxyTab = dom.window.document.querySelector('[data-subtab="space-galaxy"]');
    const galaxyContent = dom.window.document.getElementById('space-galaxy');
    expect(galaxyTab.classList.contains('hidden')).toBe(true);
    expect(galaxyContent.classList.contains('hidden')).toBe(true);

    ctx.galaxyManager.addAndReplace({
      target: 'galaxyManager',
      type: 'enable',
      targetId: 'space-galaxy',
      effectId: 'galaxyUnlock',
      sourceId: 'story',
    });

    expect(galaxyTab.classList.contains('hidden')).toBe(false);
    expect(galaxyContent.classList.contains('hidden')).toBe(false);
    const activeId = vm.runInContext('spaceSubtabManager.getActiveId()', ctx);
    expect(activeId).toBe('space-galaxy');
    expect(ctx.tabManager.lastActivated).toBe('space');
  });
});
