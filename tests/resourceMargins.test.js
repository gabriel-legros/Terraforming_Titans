const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

test('applies resource margins from configuration', () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
  vm.runInContext(code, ctx);

  const workers = { name: 'workers', displayName: 'Workers', category: 'colony', value: 0, cap: 0, hasCap: true, unlocked: true, marginBottom: 5 };
  const androids = { name: 'androids', displayName: 'Androids', category: 'colony', value: 0, cap: 0, hasCap: true, unlocked: true, marginTop: 5 };

  ctx.createResourceDisplay({ colony: { workers, androids } });

  const workerEl = dom.window.document.getElementById('workers-container');
  const androidEl = dom.window.document.getElementById('androids-container');

  expect(workerEl.style.marginBottom).toBe('5px');
  expect(androidEl.style.marginTop).toBe('5px');
});
