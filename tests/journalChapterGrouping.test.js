const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('journal chapter grouping by number', () => {
  test('multiple chapter entries are grouped together', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal">
        <h3>Journal <span id="journal-nav-container"><span id="journal-prev" class="journal-nav">\u25C0</span><span id="journal-next" class="journal-nav">\u25B6</span></span></h3>
        <div id="journal-entries"></div>
      </div>
    </body></html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.progressData = {
      chapters: [
        { id: 'c1a', type: 'journal', chapter: 1, narrative: 'A' },
        { id: 'c1b', type: 'journal', chapter: 1, narrative: 'B' },
        { id: 'c2', type: 'journal', chapter: 2, narrative: 'C' }
      ]
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    ctx.loadJournalEntries(['C'], ['A','B','C'], [{type:'chapter', id:'c2'}], [{type:'chapter', id:'c1a'}, {type:'chapter', id:'c1b'}, {type:'chapter', id:'c2'}]);

    const prev = dom.window.document.getElementById('journal-prev');
    prev.dispatchEvent(new dom.window.Event('click'));
    const entries = dom.window.document.querySelectorAll('#journal-entries p');
    expect(entries.length).toBe(2);
    expect(entries[0].textContent).toBe('A');
    expect(entries[1].textContent).toBe('B');
  });
});

