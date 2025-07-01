const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('reconstructJournalState UI update', () => {
  test('loads entries into the journal when available', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const journalCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(journalCode, ctx);
    const reconCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal-reconstruction.js'), 'utf8');
    vm.runInContext(reconCode, ctx);
    const debugCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'debug-tools.js'), 'utf8');
    vm.runInContext(debugCode, ctx);

    ctx.progressData = {
      chapters: [{ id: 'c1', type: 'journal', narrative: 'alpha' }],
      storyProjects: {}
    };
    const sm = { completedEventIds: new Set(['c1']), activeEventIds: new Set() };

    ctx.reconstructJournalState(sm, null);

    const entries = dom.window.document.querySelectorAll('#journal-entries p');
    expect(entries.length).toBe(1);
    expect(entries[0].textContent).toBe('alpha');
  });
});
