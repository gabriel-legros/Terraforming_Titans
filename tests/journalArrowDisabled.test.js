const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('journal nav arrows on new game', () => {
  test('arrows disabled when only one chapter exists', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal">
        <h3>Journal <span id="journal-nav-container"><span id="journal-prev" class="journal-nav">◀</span><span id="journal-next" class="journal-nav">▶</span></span></h3>
        <div id="journal-entries"></div>
      </div>
    </body></html>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    ctx.progressData = {
      chapters: [ { id: 'c1', type: 'journal', chapter: 1, narrative: 'A' } ]
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    ctx.resetJournal();
    jest.useFakeTimers();
    ctx.addJournalEntry('A', 'c1', { type: 'chapter', id: 'c1' });
    jest.runAllTimers();
    jest.useRealTimers();

    const prev = dom.window.document.getElementById('journal-prev');
    const next = dom.window.document.getElementById('journal-next');
    expect(prev.classList.contains('disabled')).toBe(true);
    expect(next.classList.contains('disabled')).toBe(true);
  });
});
