const { JSDOM } = require('jsdom');

describe('space storage water destination dropdown', () => {
  test('uses 12px font size', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.projectElements = {};
    const { renderSpaceStorageUI } = require('../src/js/projects/spaceStorageUI.js');
    const project = {
      name: 'spaceStorage',
      toggleResourceSelection: jest.fn(),
      waterWithdrawTarget: 'colony'
    };
    const container = document.getElementById('root');
    renderSpaceStorageUI(project, container);
    const select = projectElements[project.name].waterDestinationSelect;
    expect(select).not.toBeUndefined();
    expect(select.style.fontSize).toBe('12px');
    delete global.document;
    delete global.window;
    delete global.projectElements;
  });
});
