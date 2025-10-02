const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('building subtab scroll restoration', () => {
  test('remembers scroll position per subtab', () => {
    const html = `<!DOCTYPE html>
      <div class="buildings-subtabs">
        <div id="resource-buildings-tab" class="building-subtab active" data-subtab="resource-buildings">Resources</div>
        <div id="storage-buildings-tab" class="building-subtab" data-subtab="storage-buildings">Storage</div>
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
    vm.runInContext(uiUtilsCode + subtabCode, ctx);
    const buildingUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildingUI.js'), 'utf8');
    vm.runInContext(buildingUICode, ctx);

    const resContent = dom.window.document.getElementById('resource-buildings');
    const storageContent = dom.window.document.getElementById('storage-buildings');

    ctx.initializeBuildingTabs();
    resContent.scrollTop = 42;
    ctx.activateBuildingSubtab('storage-buildings');
    storageContent.scrollTop = 17;
    ctx.activateBuildingSubtab('resource-buildings');

    expect(resContent.scrollTop).toBe(42);
  });
});
