const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('resource header collapse', () => {
  test('header toggles resource list and arrow', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.console = console;
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createResourceContainers = createResourceContainers;', ctx);

    ctx.createResourceContainers({ surface: {} });

    const doc = dom.window.document;
    const categoryContainer = doc.querySelector('.resource-display');
    const header = doc.getElementById('surface-resources-header');
    const resourceList = doc.getElementById('surface-resources-resources-container');

    // Unhide for testing
    categoryContainer.style.display = 'block';
    header.style.display = 'block';

    const arrow = header.querySelector('.collapse-arrow');
    expect(arrow.innerHTML).toBe('▼');

    header.dispatchEvent(new dom.window.Event('click'));
    expect(resourceList.style.display).toBe('none');
    expect(arrow.innerHTML).toBe('▶');

    header.dispatchEvent(new dom.window.Event('click'));
    expect(resourceList.style.display === '' || resourceList.style.display === 'block').toBe(true);
    expect(arrow.innerHTML).toBe('▼');
  });
});

