const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('loadJournalEntries resets queue and typing', () => {
  test('loading clears pending queue and stops typing', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    // Queue an entry so typing is active
    ctx.addJournalEntry('queued');
    jest.useFakeTimers();
    jest.advanceTimersByTime(50);

    // Load new entries which should interrupt current typing
    ctx.loadJournalEntries(['loaded']);

    jest.runAllTimers();
    jest.useRealTimers();

    const entries = dom.window.document.querySelectorAll('#journal-entries p');
    expect(entries.length).toBe(1);
    expect(entries[0].textContent).toBe('loaded');
  });
});
