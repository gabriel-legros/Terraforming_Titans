const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('project card collapse', () => {
  test('title toggles collapsed class and arrow', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab-content-wrapper">
        <div id="resources-projects-list" class="projects-list"></div>
      </div>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.projectElements = projectElements;', ctx);

    const project = { name: 'test', displayName: 'Test', description: 'd', category: 'resources', cost: {}, attributes: {} };
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    const card = ctx.projectElements.test.projectItem;
    const title = card.querySelector('.card-title');
    const arrow = card.querySelector('.collapse-arrow');

    expect(card.classList.contains('collapsed')).toBe(false);
    expect(arrow.innerHTML).toBe('▼');

    title.dispatchEvent(new dom.window.Event('click'));

    expect(card.classList.contains('collapsed')).toBe(true);
    expect(arrow.innerHTML).toBe('▶');
  });
});
