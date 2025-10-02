const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('Mechanical Assistance tooltip', () => {
  test('mechanical assistance slider label includes gravity penalty tooltip', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="colony-sliders-container"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.EffectableEntity = EffectableEntity;
    const logic = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
    vm.runInContext(logic, ctx);
    const ui = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
    vm.runInContext(ui, ctx);

    ctx.initializeColonySlidersUI();

    const label = dom.window.document.querySelector('#mechanical-assistance-row label');
    const icon = label.querySelector('.info-tooltip-icon');
    expect(icon).not.toBeNull();
    expect(icon.title).toMatch(/gravity penalty/i);
  });
});

