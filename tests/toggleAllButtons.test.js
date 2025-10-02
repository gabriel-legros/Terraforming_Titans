const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('structure toggle 0 and Max buttons', () => {
  test('buttons trigger correct toggle callbacks', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const structure = { name: 'test', displayName: 'Test', canBeToggled: true, active: 2, count: 5 };
    const calls = [];
    const callback = (s, change) => calls.push(change);

    const { structureControls } = ctx.createStructureControls(structure, callback);
    dom.window.document.body.appendChild(structureControls);

    const zeroBtn = [...structureControls.querySelectorAll('button')].find(b => b.textContent === '0');
    const maxBtn = [...structureControls.querySelectorAll('button')].find(b => b.textContent === 'Max');

    zeroBtn.click();
    maxBtn.click();

    expect(calls[0]).toBe(-2);
    expect(calls[1]).toBe(3);
  });
});
