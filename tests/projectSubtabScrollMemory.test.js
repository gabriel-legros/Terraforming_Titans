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
    vm.runInContext(uiUtilsCode, ctx);
    const projectsUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(projectsUICode, ctx);

    // Trigger DOMContentLoaded to set up listeners
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const container = dom.window.document.getElementById('special-projects');
    const infraTab = dom.window.document.getElementById('infrastructure-projects-tab');
    const resTab = dom.window.document.getElementById('resources-projects-tab');

    container.scrollTop = 42;
    infraTab.dispatchEvent(new dom.window.Event('click'));
    container.scrollTop = 17;
    resTab.dispatchEvent(new dom.window.Event('click'));
    expect(container.scrollTop).toBe(42);
  });
});
