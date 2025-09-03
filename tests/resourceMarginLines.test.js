const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

test('adds separator lines for resource margins and hides line with resource', () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="resources-container"></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'resourceUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  ctx.formatNumber = n => n;

  const workers = { name: 'workers', displayName: 'Workers', category: 'colony', value: 0, cap: 0, hasCap: true, unlocked: true, marginBottom: 5, isBooleanFlagSet: () => false };
  const research = { name: 'research', displayName: 'Research', category: 'colony', value: 0, hasCap: false, unlocked: true, marginTop: 5, isBooleanFlagSet: () => false };

  ctx.createResourceDisplay({ colony: { workers, research } });
  ctx.updateResourceDisplay({ colony: { workers, research } });

  const workerEl = dom.window.document.getElementById('workers-container');
  const researchEl = dom.window.document.getElementById('research-container');

  expect(workerEl.classList.contains('resource-divider-bottom')).toBe(true);
  expect(researchEl.classList.contains('resource-divider-top')).toBe(true);
  expect(workerEl.style.getPropertyValue('--divider-margin-bottom')).toBe('5px');
  expect(researchEl.style.getPropertyValue('--divider-margin-top')).toBe('5px');
  expect(workerEl.style.display).toBe('block');
  expect(researchEl.style.display).toBe('block');

  research.unlocked = false;
  ctx.updateResourceDisplay({ colony: { workers, research } });
  expect(researchEl.style.display).toBe('none');
});
