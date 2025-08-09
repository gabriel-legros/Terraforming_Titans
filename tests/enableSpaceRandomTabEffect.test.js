const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('enable effect with SpaceManager and activateSpaceSubtab', () => {
  test('reveals and activates the Random subtab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="space-subtab" data-subtab="space-story"></div>
      <div class="space-subtab hidden" data-subtab="space-random"></div>
      <div id="space-story" class="space-subtab-content active">
        <div id="planet-selection-options"></div>
        <div id="travel-status"></div>
      </div>
      <div id="space-random" class="space-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.planetParameters = {
      mars: { name: 'Mars', celestialParameters: { distanceFromSun: 1, gravity: 3.7, radius: 3389, albedo: 0.25 } }
    };
    vm.createContext(ctx);
    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
    const spaceUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'spaceUI.js'), 'utf8');
    vm.runInContext(`${uiUtilsCode}\n${effectCode}\n${spaceCode}\n${spaceUICode}; this.SpaceManager = SpaceManager; this.EffectableEntity = EffectableEntity;`, ctx);
    ctx.spaceManager = new ctx.SpaceManager(ctx.planetParameters);
    ctx.initializeSpaceUI(ctx.spaceManager);
    ctx.globalEffects = new ctx.EffectableEntity({ description: 'global' });
    ctx.spaceManager.addAndReplace({
      target: 'spaceManager',
      type: 'enable',
      targetId: 'space-random',
      effectId: 't1',
      sourceId: 't1'
    });
    ctx.globalEffects.addAndReplace({
      target: 'global',
      type: 'activateSubtab',
      subtabClass: 'space-subtab',
      contentClass: 'space-subtab-content',
      targetId: 'space-random',
      unhide: true,
      effectId: 't2',
      sourceId: 't2'
    });
    const tab = dom.window.document.querySelector('[data-subtab="space-random"]');
    const content = dom.window.document.getElementById('space-random');
    const visible = vm.runInContext('spaceRandomTabVisible', ctx);
    expect(visible).toBe(true);
    expect(tab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
    expect(tab.classList.contains('active')).toBe(true);
    expect(content.classList.contains('active')).toBe(true);
  });

  test('activating Random also switches to the Space tab when requested', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="tab" data-tab="settings"></div>
      <div class="tab" data-tab="space"></div>
      <div id="settings" class="tab-content active"></div>
      <div id="space" class="tab-content"></div>
      <div class="space-subtab" data-subtab="space-story"></div>
      <div class="space-subtab hidden" data-subtab="space-random"></div>
      <div id="space-story" class="space-subtab-content active"></div>
      <div id="space-random" class="space-subtab-content hidden"></div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.planetParameters = {
      mars: { name: 'Mars', celestialParameters: { distanceFromSun: 1, gravity: 3.7, radius: 3389, albedo: 0.25 } }
    };
    vm.createContext(ctx);

    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const tabCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'tab.js'), 'utf8');
    const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
    const spaceUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'spaceUI.js'), 'utf8');
    vm.runInContext(`${uiUtilsCode}\n${effectCode}\n${tabCode}\n${spaceCode}\n${spaceUICode}; this.SpaceManager = SpaceManager; this.EffectableEntity = EffectableEntity; this.TabManager = TabManager;`, ctx);

    // Set up managers
    ctx.spaceManager = new ctx.SpaceManager(ctx.planetParameters);
    ctx.initializeSpaceUI(ctx.spaceManager);
    ctx.tabManager = new ctx.TabManager({ description: 'tabs' }, { tabs: [] });
    ctx.globalEffects = new ctx.EffectableEntity({ description: 'global' });

    // Activate the Space tab and Random subtab
    ctx.tabManager.addAndReplace({ target: 'tab', type: 'activateTab', targetId: 'space', effectId: 't0', sourceId: 't0' });
    ctx.spaceManager.addAndReplace({ target: 'spaceManager', type: 'enable', targetId: 'space-random', effectId: 't1', sourceId: 't1' });
    ctx.globalEffects.addAndReplace({
      target: 'global',
      type: 'activateSubtab',
      subtabClass: 'space-subtab',
      contentClass: 'space-subtab-content',
      targetId: 'space-random',
      unhide: true,
      effectId: 't2',
      sourceId: 't2'
    });

    const spaceTab = dom.window.document.querySelector('.tab[data-tab="space"]');
    const spaceContent = dom.window.document.getElementById('space');
    expect(spaceTab.classList.contains('active')).toBe(true);
    expect(spaceContent.classList.contains('active')).toBe(true);
  });
});
