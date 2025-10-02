const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('building subtab manager', () => {
  function setup() {
    const html = `<!DOCTYPE html>
      <div class="buildings-subtabs">
        <div id="resource-buildings-tab" class="building-subtab active" data-subtab="resource-buildings"></div>
        <div id="storage-buildings-tab" class="building-subtab" data-subtab="storage-buildings"></div>
      </div>
      <div class="building-subtab-content-wrapper">
        <div id="resource-buildings" class="building-subtab-content active"></div>
        <div id="storage-buildings" class="building-subtab-content"></div>
      </div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.markBuildingSubtabViewed = () => {};
    ctx.buildings = {};
    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const subtabCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'subtab-manager.js'), 'utf8');
    const buildingUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildingUI.js'), 'utf8');
    vm.runInContext(uiUtilsCode + subtabCode + buildingUICode, ctx);
    ctx.initializeBuildingTabs();
    return { dom, ctx };
  }

  test('activates subtabs', () => {
    const { dom, ctx } = setup();
    const storageTab = dom.window.document.getElementById('storage-buildings-tab');
    const storageContent = dom.window.document.getElementById('storage-buildings');
    ctx.activateBuildingSubtab('storage-buildings');
    expect(storageTab.classList.contains('active')).toBe(true);
    expect(storageContent.classList.contains('active')).toBe(true);
  });

  test('show and hide subtabs programmatically', () => {
    const { dom, ctx } = setup();
    const storageTab = dom.window.document.getElementById('storage-buildings-tab');
    const storageContent = dom.window.document.getElementById('storage-buildings');
    ctx.buildingSubtabManager().hide('storage-buildings');
    expect(storageTab.classList.contains('hidden')).toBe(true);
    expect(storageContent.classList.contains('hidden')).toBe(true);
    ctx.buildingSubtabManager().show('storage-buildings');
    expect(storageTab.classList.contains('hidden')).toBe(false);
    expect(storageContent.classList.contains('hidden')).toBe(false);
  });
});
