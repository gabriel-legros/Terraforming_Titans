const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('silence milestone alert setting', () => {
  test('alert hidden when silenced', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="terraforming-tab"><span id="terraforming-alert" class="milestone-alert">!</span></div>
      <div class="terraforming-subtab" data-subtab="milestone-terraforming">Milestones<span id="milestone-subtab-alert" class="milestone-alert">!</span></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.milestonesManager = { getCompletableMilestones: () => [{}] };
    const code = 'let gameSettings = { silenceMilestoneAlert: true };\n' +
      fs.readFileSync(path.join(__dirname, '..', 'src/js', 'milestonesUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.checkMilestoneAlert();
    ctx.updateMilestoneAlert();
    expect(dom.window.document.getElementById('terraforming-alert').style.display).toBe('none');
    expect(dom.window.document.getElementById('milestone-subtab-alert').style.display).toBe('none');

    vm.runInContext('gameSettings.silenceMilestoneAlert = false;', ctx);
    ctx.updateMilestoneAlert();
    expect(dom.window.document.getElementById('terraforming-alert').style.display).toBe('inline');
    expect(dom.window.document.getElementById('milestone-subtab-alert').style.display).toBe('inline');
  });
});
