const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

test('adds priority triangles next to worker cost', () => {
  const dom = new JSDOM(`<!DOCTYPE html><div id="c"></div>`, { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.document = dom.window.document;
  ctx.resources = { colony: { workers: { value: 0 }, colonists: { value: 0 }, androids: { value: 0, cap: 0 } } };
  ctx.populationModule = { updateWorkerRequirements: () => {}, workerResource: { cap: 0, value: 0, totalWorkersRequired: 0 } };
  ctx.formatNumber = () => '';
  ctx.capitalizeFirstLetter = s => s;
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code + '; this.updateStructureCostDisplay = updateStructureCostDisplay;', ctx);

  const structure = {
    name: 'test',
    workerPriority: 0,
    getEffectiveCost: () => ({}),
    getTotalWorkerNeed: () => 1,
    getEffectiveWorkerMultiplier: () => 1
  };

  const el = ctx.document.getElementById('c');
  ctx.updateStructureCostDisplay(el, structure);
  const up = el.querySelector('.worker-priority-btn.up');
  const down = el.querySelector('.worker-priority-btn.down');
  expect(up).not.toBeNull();
  expect(down).not.toBeNull();
  up.dispatchEvent(new dom.window.Event('click'));
  expect(structure.workerPriority).toBe(1);
  up.dispatchEvent(new dom.window.Event('click'));
  expect(structure.workerPriority).toBe(0);
  down.dispatchEvent(new dom.window.Event('click'));
  expect(structure.workerPriority).toBe(-1);
});
