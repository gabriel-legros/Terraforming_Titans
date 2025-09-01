const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('project subtab scroll restoration', () => {
  test('remembers scroll position per subtab', () => {
    const html = `<!DOCTYPE html>
      <div id="special-projects" class="tab-content">
        <div class="projects-subtabs">
          <div id="resources-projects-tab" class="projects-subtab active" data-subtab="resources-projects">Resources</div>
          <div id="infrastructure-projects-tab" class="projects-subtab" data-subtab="infrastructure-projects">Infrastructure</div>
        </div>
        <div class="projects-subtab-content-wrapper">
          <div id="resources-projects" class="projects-subtab-content active"></div>
          <div id="infrastructure-projects" class="projects-subtab-content"></div>
        </div>
      </div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.projectManager = { projects: {} };
    ctx.spaceManager = { getCurrentPlanetKey: () => 'mars' };
    ctx.gameSettings = { silenceUnlockAlert: false };
    ctx.markProjectSubtabViewed = () => {};

    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const subtabCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'subtab-manager.js'), 'utf8');
    vm.runInContext(uiUtilsCode + subtabCode, ctx);
    const projectsUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(projectsUICode, ctx);

    ctx.initializeProjectsUI();

    const container = dom.window.document.getElementById('special-projects');
    container.scrollTop = 42;
    ctx.activateProjectSubtab('infrastructure-projects');
    container.scrollTop = 17;
    ctx.activateProjectSubtab('resources-projects');
    expect(container.scrollTop).toBe(42);
  });
});
