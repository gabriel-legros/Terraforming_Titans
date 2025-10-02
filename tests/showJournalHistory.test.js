const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('showJournalHistory overlay', () => {
  test('creates and removes history overlay', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.loadJournalEntries(['first', 'second']);
    ctx.showJournalHistory();

    const overlay = dom.window.document.querySelector('.history-overlay');
    expect(overlay).not.toBeNull();
    const entries = overlay.querySelectorAll('.history-entries p');
    expect(entries.length).toBe(2);
    expect(entries[0].textContent).toBe('first');
    expect(entries[1].textContent).toBe('second');

    const close = overlay.querySelector('.history-close-button');
    close.dispatchEvent(new dom.window.Event('click'));
    expect(dom.window.document.querySelector('.history-overlay')).toBeNull();
  });

  test('history persists after clearing current entries', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.addJournalEntry('one');
    jest.useFakeTimers();
    jest.runAllTimers();
    jest.useRealTimers();

    ctx.clearJournal();
    ctx.showJournalHistory();

    const entries = dom.window.document.querySelectorAll('.history-entries p');
    expect(entries.length).toBe(1);
    expect(entries[0].textContent).toBe('one');
  });

  test('custom history loaded via loadJournalEntries', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.loadJournalEntries(['current'], ['old', 'older']);
    ctx.showJournalHistory();

    const entries = dom.window.document.querySelectorAll('.history-entries p');
    expect(entries.length).toBe(2);
    expect(entries[0].textContent).toBe('old');
    expect(entries[1].textContent).toBe('older');
  });
});
