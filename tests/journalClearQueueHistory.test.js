const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('clearJournal moves queued entries to history', () => {
  test('queued entries are preserved when clearing', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    jest.useFakeTimers();
    ctx.addJournalEntry('first');
    jest.runAllTimers();
    ctx.addJournalEntry('second');
    ctx.clearJournal();
    jest.useRealTimers();

    const history = vm.runInContext('journalHistoryData', ctx);
    const entries = vm.runInContext('journalEntriesData', ctx);
    const queueLen = vm.runInContext('journalQueue.length', ctx);
    expect(history).toEqual(['first', 'second']);
    expect(entries).toEqual([]);
    expect(queueLen).toBe(0);
  });
});
