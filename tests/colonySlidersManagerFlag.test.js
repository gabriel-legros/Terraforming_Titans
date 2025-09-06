const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

test('updateColonySlidersUI shows row when mechanical assistance flag enabled', () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="colony-sliders-container"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.EffectableEntity = EffectableEntity;
  ctx.terraforming = { celestialParameters: { gravity: 15 } };

  const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
  vm.runInContext(logicCode, ctx);

  const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
  vm.runInContext(uiCode, ctx);

  ctx.initializeColonySlidersUI();
  let row = dom.window.document.getElementById('mechanical-assistance-row');
  expect(row.style.display).toBe('none');

  ctx.colonySliderSettings.applyBooleanFlag({ flagId: 'mechanicalAssistance', value: true });
  ctx.updateColonySlidersUI();
  row = dom.window.document.getElementById('mechanical-assistance-row');
  expect(row.style.display).toBe('grid');
});

test('updateColonySlidersUI hides row without gravity penalty', () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="colony-sliders-container"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.EffectableEntity = EffectableEntity;
  ctx.terraforming = { celestialParameters: { gravity: 5 } };

  const logicCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySliders.js'), 'utf8');
  vm.runInContext(logicCode, ctx);

  const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colonySlidersUI.js'), 'utf8');
  vm.runInContext(uiCode, ctx);

  ctx.initializeColonySlidersUI();
  ctx.colonySliderSettings.applyBooleanFlag({ flagId: 'mechanicalAssistance', value: true });
  ctx.updateColonySlidersUI();
  const row = dom.window.document.getElementById('mechanical-assistance-row');
  expect(row.style.display).toBe('none');
});
