const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('manual toggle buttons disable auto-active', () => {
  test('clicking any toggle button unchecks auto-active box', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = n => n; // stub to avoid errors in button text updates
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const structure = {
      name: 'test',
      displayName: 'Test',
      canBeToggled: true,
      active: 2,
      count: 5,
      autoActiveEnabled: true
    };
    const callback = () => {};

    const { structureControls } = ctx.createStructureControls(structure, callback);
    dom.window.document.body.appendChild(structureControls);

    const setActiveButton = dom.window.document.createElement('button');
    setActiveButton.id = `${structure.name}-set-active-button`;
    const checkbox = dom.window.document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('auto-active-checkbox');
    setActiveButton.appendChild(checkbox);
    dom.window.document.body.appendChild(setActiveButton);

    const zeroBtn = dom.window.document.getElementById(`${structure.name}-zero-button`);
    const decBtn = dom.window.document.getElementById(`${structure.name}-decrease-button`);
    const incBtn = dom.window.document.getElementById(`${structure.name}-increase-button`);
    const maxBtn = [...structureControls.querySelectorAll('button')].find(b => b.textContent === 'Max');
    const buttons = [zeroBtn, decBtn, incBtn, maxBtn];

    buttons.forEach(btn => {
      checkbox.checked = true;
      structure.autoActiveEnabled = true;
      btn.click();
      expect(checkbox.checked).toBe(false);
      expect(structure.autoActiveEnabled).toBe(false);
    });
  });
});
