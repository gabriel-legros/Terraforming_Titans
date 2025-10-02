const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('journal toggle functionality', () => {
  test('collapses journal and shows alert on new entry', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal" class="journal"><div id="journal-entries"></div></div>
      <button id="toggle-journal-button"></button>
      <button id="show-journal-button" class="hidden"></button>
    </body></html>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    ctx.toggleJournal();
    expect(dom.window.document.getElementById('journal').classList.contains('collapsed')).toBe(true);

    jest.useFakeTimers();
    ctx.addJournalEntry('Hi');
    jest.runAllTimers();
    jest.useRealTimers();

    expect(dom.window.document.getElementById('show-journal-button').classList.contains('unread')).toBe(true);
  });
});
