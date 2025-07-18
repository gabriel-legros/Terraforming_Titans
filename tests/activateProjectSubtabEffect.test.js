const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
const projectsUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');

describe('activateProjectSubtab effect', () => {
  test('switches to story projects subtab', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab active" data-subtab="resources-projects"></div>
      <div class="projects-subtab hidden" data-subtab="story-projects"></div>
      <div id="resources-projects" class="projects-subtab-content active"></div>
      <div id="story-projects" class="projects-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    vm.runInContext(uiUtilsCode + effectCode + projectsUICode + projectsCode + '; this.EffectableEntity = EffectableEntity; this.ProjectManager = ProjectManager;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.addAndReplace({
      type: 'activateSubtab',
      subtabClass: 'projects-subtab',
      contentClass: 'projects-subtab-content',
      targetId: 'story-projects',
      unhide: true,
      effectId: 'test',
      sourceId: 'test'
    });

    const subtab = dom.window.document.querySelector('[data-subtab="story-projects"]');
    const content = dom.window.document.getElementById('story-projects');
    expect(subtab.classList.contains('active')).toBe(true);
    expect(content.classList.contains('active')).toBe(true);
  });
});
