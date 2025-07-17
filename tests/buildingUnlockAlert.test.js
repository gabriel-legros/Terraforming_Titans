const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('building unlock alert', () => {
  test('shows alert on unlock and clears when viewed', () => {
    const html = `<!DOCTYPE html>
      <div id="buildings-tab"><span id="buildings-alert" class="unlock-alert">!</span></div>
      <div class="buildings-subtabs">
        <div id="resource-buildings-tab" class="building-subtab" data-subtab="resource-buildings">Resources<span id="resource-buildings-alert" class="unlock-alert">!</span></div>
      </div>
      <div class="building-subtab-content-wrapper"><div id="resource-buildings" class="building-subtab-content"></div></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.buildings = { mine: { category: 'resource', unlocked: true, alertedWhenUnlocked: false } };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.registerBuildingUnlockAlert('resource-buildings');
    expect(dom.window.document.getElementById('buildings-alert').style.display).toBe('inline');

    ctx.markBuildingSubtabViewed('resource-buildings');
    expect(dom.window.document.getElementById('buildings-alert').style.display).toBe('none');
    expect(ctx.buildings.mine.alertedWhenUnlocked).toBe(true);
  });
});
