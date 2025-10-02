const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('journal auto scroll', () => {
  test('container scrolls to bottom after typing', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal" style="height:100px; overflow:auto;"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });

    const ctx = dom.getInternalVMContext();
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);

    const journal = dom.window.document.getElementById('journal');
    Object.defineProperty(journal, 'scrollHeight', { value: 200, configurable: true });

    jest.useFakeTimers();
    ctx.addJournalEntry('abc');
    jest.runAllTimers();
    jest.useRealTimers();

    expect(journal.scrollTop).toBe(200);
  });
});
