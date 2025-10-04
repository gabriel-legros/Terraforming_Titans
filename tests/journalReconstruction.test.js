const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('journal reconstruction from sources', () => {
  test('mapSourcesToText returns updated text', () => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div id="journal"><div id="journal-entries"></div></div>
    </body></html>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.progressData = {
      chapters: [ { id: 'c1', type: 'journal', narrative: 'alpha' } ],
      storyProjects: { p1: { name: 'P1', attributes: { storySteps: ['step1'] } } }
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'journal.js'), 'utf8');
    vm.runInContext(code, ctx);
    const res = ctx.mapSourcesToText([{type:'chapter', id:'c1'}, {type:'project', id:'p1', step:0}]);
    expect(res).toEqual(['alpha', 'P1 1/1: step1']);
  });
});
