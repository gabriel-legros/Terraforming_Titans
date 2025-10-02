const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Terraforming tab alert for milestones', () => {
  test('shows alert on new milestone and clears when viewed', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="terraforming-tab"><span id="terraforming-alert" class="milestone-alert">!</span></div>
      <div class="terraforming-subtab" data-subtab="milestone-terraforming">Milestones<span id="milestone-subtab-alert" class="milestone-alert">!</span></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.milestonesManager = { getCompletableMilestones: () => [] };
    ctx.gameSettings = { silenceMilestoneAlert: false };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'milestonesUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.checkMilestoneAlert();
    ctx.updateMilestoneAlert();
    expect(dom.window.document.getElementById('terraforming-alert').style.display).toBe('none');

    ctx.milestonesManager.getCompletableMilestones = () => [{}];
    ctx.checkMilestoneAlert();
    ctx.updateMilestoneAlert();
    expect(dom.window.document.getElementById('terraforming-alert').style.display).toBe('inline');

    ctx.markMilestonesViewed();
    expect(dom.window.document.getElementById('terraforming-alert').style.display).toBe('none');
  });

  test('keeps tab alert hidden when milestones subtab is locked', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div id="terraforming-tab"><span id="terraforming-alert" class="milestone-alert">!</span></div>
      <div class="terraforming-subtab hidden" data-subtab="milestone-terraforming">Milestones<span id="milestone-subtab-alert" class="milestone-alert">!</span></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.milestonesManager = { getCompletableMilestones: () => [{}] };
    ctx.gameSettings = { silenceMilestoneAlert: false };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'milestonesUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.checkMilestoneAlert();
    ctx.updateMilestoneAlert();

    expect(dom.window.document.getElementById('terraforming-alert').style.display).toBe('none');
    expect(dom.window.document.getElementById('milestone-subtab-alert').style.display).toBe('none');
  });
});
