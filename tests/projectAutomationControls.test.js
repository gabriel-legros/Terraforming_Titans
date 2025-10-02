const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('project automation controls via polymorphism', () => {
  test('renderAutomationUI is invoked during project creation', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.projectElements = {};
    ctx.resources = {};
    ctx.startProjectWithSelectedResources = () => {};
    ctx.toggleProjectCollapse = () => {};
    ctx.moveProject = () => {};
    ctx.formatNumber = () => {};
    ctx.formatTotalCostDisplay = () => '';
    vm.runInContext('function capitalizeFirstLetter(s){ return s.charAt(0).toUpperCase() + s.slice(1); }', ctx);

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem;', ctx);

    const renderAutomationUI = jest.fn(container => {
      const span = container.ownerDocument.createElement('span');
      span.id = 'test-auto';
      container.appendChild(span);
    });

    const project = {
      name: 'dummyProject',
      displayName: 'Dummy Project',
      description: 'test',
      cost: {},
      attributes: {},
      category: 'resources',
      renderAutomationUI
    };

    ctx.createProjectItem(project);
    expect(renderAutomationUI).toHaveBeenCalled();
    expect(ctx.document.getElementById('test-auto')).not.toBeNull();
  });
});
