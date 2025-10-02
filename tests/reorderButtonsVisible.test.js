const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('reorder buttons visibility', () => {
  test('remain visible when project card is collapsed', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'src/css', 'projects.css'), 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html><style>${css}</style><div class="projects-subtab-content-wrapper"><div id="resources-projects-list" class="projects-list"></div></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.window = dom.window;
    ctx.console = console;
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.toggleProjectCollapse = toggleProjectCollapse; this.projectElements = projectElements;', ctx);

    const project = { name: 'test', displayName: 'Test', description: 'd', category: 'resources', cost: {}, attributes: {} };
    ctx.createProjectItem(project);
    ctx.projectElements = vm.runInContext('projectElements', ctx);
    const card = ctx.projectElements.test.projectItem;
    ctx.toggleProjectCollapse(card);
    const reorder = card.querySelector('.reorder-buttons');
    const style = dom.window.getComputedStyle(reorder);
    expect(style.display).not.toBe('none');
  });
});
