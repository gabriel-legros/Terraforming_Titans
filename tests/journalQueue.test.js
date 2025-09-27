const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('journal entry queue', () => {
  test('entries type sequentially', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
      <span id="journal-alert" class="journal-alert"></span>
    </body></html>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    jest.useFakeTimers();
    ctx.addJournalEntry('abc');
    ctx.addJournalEntry('def');

    // Only the first entry should be in the DOM immediately
    expect(dom.window.document.querySelectorAll('#journal-entries p').length).toBe(1);

    jest.runAllTimers();
    jest.useRealTimers();

    const entries = dom.window.document.querySelectorAll('#journal-entries p');
    expect(entries.length).toBe(2);
    expect(entries[0].textContent).toBe('abc');
    expect(entries[1].textContent).toBe('def');
  });
});
