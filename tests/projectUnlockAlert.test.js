const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('project unlock alert', () => {
  test('shows alert on unlock and clears when viewed', () => {
    const html = `<!DOCTYPE html>
      <div id="special-projects-tab"><span id="projects-alert" class="unlock-alert">!</span></div>
      <div class="projects-subtabs">
        <div id="resources-projects-tab" class="projects-subtab" data-subtab="resources-projects">Resources<span id="resources-projects-alert" class="unlock-alert">!</span></div>
      </div>
      <div class="projects-subtab-content-wrapper"><div id="resources-projects" class="projects-subtab-content"></div></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.projectManager = { projects: { probe: { category: 'resources', unlocked: true, alertedWhenUnlocked: false } } };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.registerProjectUnlockAlert('resources-projects');
    expect(dom.window.document.getElementById('projects-alert').style.display).toBe('inline');

    ctx.markProjectSubtabViewed('resources-projects');
    expect(dom.window.document.getElementById('projects-alert').style.display).toBe('none');
    expect(ctx.projectManager.projects.probe.alertedWhenUnlocked).toBe(true);
  });
});
