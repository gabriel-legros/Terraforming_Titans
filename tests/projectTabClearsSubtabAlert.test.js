const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('project subtab alert clears on tab view', () => {
  test('clears active subtab alert when viewing projects tab', () => {
    const html = `<!DOCTYPE html>
      <div id="special-projects-tab"><span id="projects-alert" class="unlock-alert">!</span></div>
      <div class="projects-subtabs">
        <div id="resources-projects-tab" class="projects-subtab active" data-subtab="resources-projects">Resources<span id="resources-projects-alert" class="unlock-alert">!</span></div>
      </div>
      <div class="projects-subtab-content-wrapper"><div id="resources-projects" class="projects-subtab-content active"></div></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.projectManager = { projects: { probe: { category: 'resources', unlocked: true, alertedWhenUnlocked: false, attributes: {} } } };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.registerProjectUnlockAlert('resources-projects');
    expect(dom.window.document.getElementById('resources-projects-alert').style.display).toBe('inline');

    ctx.markProjectsViewed();
    expect(dom.window.document.getElementById('resources-projects-alert').style.display).toBe('none');
  });

  test('clears alert when subtab manager infers active subtab', () => {
    const html = `<!DOCTYPE html>
      <div id="buildings-tab" class="tab active"></div>
      <div id="special-projects-tab" class="tab"></div>
      <div class="projects-subtabs">
        <div id="resources-projects-tab" class="projects-subtab active" data-subtab="resources-projects">Resources<span id="resources-projects-alert" class="unlock-alert">!</span></div>
      </div>
      <div class="projects-subtab-content-wrapper"><div id="resources-projects" class="projects-subtab-content active"></div></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.projectManager = { projects: { probe: { category: 'resources', unlocked: true, alertedWhenUnlocked: false, attributes: {} } } };

    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const subtabCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'subtab-manager.js'), 'utf8');
    vm.runInContext(uiUtilsCode + subtabCode, ctx);
    const projectsUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(projectsUICode, ctx);

    ctx.initializeProjectTabs();

    ctx.registerProjectUnlockAlert('resources-projects');
    expect(dom.window.document.getElementById('resources-projects-alert').style.display).toBe('inline');

    ctx.markProjectsViewed();
    expect(dom.window.document.getElementById('resources-projects-alert').style.display).toBe('none');
  });
});

