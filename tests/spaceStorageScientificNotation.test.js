const { JSDOM } = require('jsdom');

class SpaceStorageProject {
  constructor() {
    this.name = 'spaceStorage';
    this.strategicReserve = 0;
  }
}

global.SpaceStorageProject = SpaceStorageProject;
global.projectElements = {};
require('../src/js/projects/spaceStorageUI.js');
delete global.SpaceStorageProject;
delete global.projectElements;

describe('space storage strategic reserve input', () => {
  test('accepts scientific notation', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.projectElements = {};
    const project = new SpaceStorageProject();
    const container = document.getElementById('root');
    const inputContainer = project.createStrategicReserveInput();
    container.appendChild(inputContainer);
    const input = projectElements[project.name].strategicReserveInput;
    input.value = '1e3';
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(project.strategicReserve).toBe(1000);
    expect(input.value).toBe('1000');
    delete global.document;
    delete global.window;
    delete global.projectElements;
  });

  test('includes tooltip describing reserve and scientific notation', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.projectElements = {};
    const project = new SpaceStorageProject();
    const container = document.getElementById('root');
    const inputContainer = project.createStrategicReserveInput();
    container.appendChild(inputContainer);
    const label = projectElements[project.name].strategicReserveContainer.querySelector('label');
    const icon = label.querySelector('.info-tooltip-icon');
    expect(icon).not.toBeNull();
    expect(icon.title).toContain('mega project');
    expect(icon.title).toContain('transfers ignore');
    expect(icon.title).toContain('scientific notation');
    delete global.document;
    delete global.window;
    delete global.projectElements;
  });
});
