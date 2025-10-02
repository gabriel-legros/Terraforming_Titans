const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('RWG history list', () => {
  test('shows visited worlds sorted by departure time and paginated', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="space-random"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    const statuses = {};
    for (let i = 1; i <= 11; i++) {
      statuses[String(i)] = {
        name: `World${i}`,
        original: { classification: { archetype: 'mars-like' } },
        terraformed: i % 2 === 0,
        visited: true,
        departedAt: i
      };
    }
    ctx.spaceManager = { randomWorldStatuses: statuses };
    ctx.rwgManager = { isOrbitLocked: () => false, isTypeLocked: () => false };

    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(`${rwgUICode} initializeRandomWorldUI(); updateRandomWorldUI();`, ctx);

    const list = dom.window.document.querySelectorAll('.rwg-history-row');
    expect(list.length).toBe(10);
    expect(list[0].textContent).toContain('World11');
    expect(dom.window.document.getElementById('rwg-history-page').textContent).toBe('1/2');

    dom.window.document.getElementById('rwg-history-next').click();
    const list2 = dom.window.document.querySelectorAll('.rwg-history-row');
    expect(list2.length).toBe(1);
    expect(list2[0].textContent).toContain('World1');
    expect(dom.window.document.getElementById('rwg-history-page').textContent).toBe('2/2');
  });
});
