const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');

describe('updateStoryProjectsVisibility', () => {
  test('shows or hides the story subtab based on unlocked projects', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab hidden" data-subtab="story-projects"></div>
      <div id="story-projects" class="projects-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.projectManager = { projects: { probe: { category: 'story', unlocked: false, attributes: { planet: 'titan' } } } };
    ctx.spaceManager = { getCurrentPlanetKey: () => 'titan' };
    vm.createContext(ctx);
    vm.runInContext(uiCode + '; this.updateStoryProjectsVisibility = updateStoryProjectsVisibility;', ctx);

    ctx.updateStoryProjectsVisibility();
    const subtab = dom.window.document.querySelector('[data-subtab="story-projects"]');
    const content = dom.window.document.getElementById('story-projects');
    expect(subtab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);

    ctx.projectManager.projects.probe.unlocked = true;
    ctx.updateStoryProjectsVisibility();
    expect(subtab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
  });
});
