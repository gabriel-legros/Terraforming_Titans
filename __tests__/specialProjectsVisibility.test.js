const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const uiCode = fs.readFileSync(path.join(__dirname, '..', 'projectsUI.js'), 'utf8');

describe('updateSpecialProjectsVisibility', () => {
  test('shows or hides the special subtab based on unlocked projects', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab hidden" data-subtab="special-projects"></div>
      <div id="special-projects" class="projects-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectManager = { projects: { probe: { category: 'special', unlocked: false, attributes: { planet: 'titan' } } } };
    ctx.spaceManager = { getCurrentPlanetKey: () => 'titan' };
    vm.createContext(ctx);
    vm.runInContext(uiCode + '; this.updateSpecialProjectsVisibility = updateSpecialProjectsVisibility;', ctx);

    ctx.updateSpecialProjectsVisibility();
    const subtab = dom.window.document.querySelector('[data-subtab="special-projects"]');
    const content = dom.window.document.getElementById('special-projects');
    expect(subtab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);

    ctx.projectManager.projects.probe.unlocked = true;
    ctx.updateSpecialProjectsVisibility();
    expect(subtab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
  });
});
